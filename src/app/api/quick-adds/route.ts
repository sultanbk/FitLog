import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE_MAX_AGE, DEMO_FOOD_ENTRIES_COOKIE, DEMO_QUICK_ADDS_COOKIE, DEMO_SESSION_COOKIE, getDemoFoodEntries, getDemoQuickAdds, getDemoState } from "@/lib/demo-session";

const meals = ["breakfast", "lunch", "snack", "dinner"] as const;
const numbers = ["calories", "protein_g", "carbs_g", "fat_g"] as const;
function back(request: Request, day: string, key: string, value: string) {
  const url = new URL("/today", request.url); url.searchParams.set("day", day); url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}
function validDay(day: string) { return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`)); }

export async function POST(request: Request) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const day = String(form.get("entry_date") ?? "");
  const id = String(form.get("id") ?? "");
  if (!validDay(day)) return back(request, new Date().toISOString().slice(0, 10), "error", "Invalid+date");
  if (!["save", "add", "delete"].includes(action)) return back(request, day, "error", "Invalid+quick+add+action");
  const name = String(form.get("name") ?? "").trim();
  const meal = String(form.get("meal") ?? "");
  const is_guessed = form.get("is_guessed") === "true";
  const values = Object.fromEntries(numbers.map((key) => [key, Number(form.get(key))])) as Record<typeof numbers[number], number>;
  if (action !== "delete" && (name.length < 1 || name.length > 100 || !meals.includes(meal as typeof meals[number]) || numbers.some((key) => !Number.isFinite(values[key]) || values[key] < 0 || values[key] > (key === "calories" ? 20000 : 1000)) || !Number.isInteger(values.calories))) {
    return back(request, day, "error", "Check+the+quick+add+details");
  }

  if (process.env.FITLOG_ENABLE_DEMO === "true") {
    const demo = await getDemoState();
    if (!demo.active || !demo.profile || request.headers.get("cookie")?.split(";").some((part) => part.trim() === `${DEMO_SESSION_COOKIE}=1`) !== true) return NextResponse.redirect(new URL("/login", request.url), 303);
    const cookieStore = await cookies();
    const quickAdds = await getDemoQuickAdds();
    if (action === "delete") {
      cookieStore.set(DEMO_QUICK_ADDS_COOKIE, Buffer.from(JSON.stringify(quickAdds.filter((item) => item.id !== id))).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: DEMO_COOKIE_MAX_AGE });
      return back(request, day, "saved", "1");
    }
    if (action === "save") {
      const next = [{ id: randomUUID(), name, meal: meal as typeof meals[number], ...values, is_guessed, created_at: new Date().toISOString() }, ...quickAdds].slice(0, 8);
      cookieStore.set(DEMO_QUICK_ADDS_COOKIE, Buffer.from(JSON.stringify(next)).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: DEMO_COOKIE_MAX_AGE });
      return back(request, day, "saved", "1");
    }
    const entries = await getDemoFoodEntries();
    const entry = { id: randomUUID(), entry_date: day, name, meal: meal as typeof meals[number], ...values, is_guessed, created_at: new Date().toISOString() };
    cookieStore.set(DEMO_FOOD_ENTRIES_COOKIE, Buffer.from(JSON.stringify([entry, ...entries].slice(0, 20))).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: DEMO_COOKIE_MAX_AGE });
    return back(request, day, "saved", "1");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  if (action === "delete") {
    const { error } = await supabase.from("quick_adds").delete().eq("id", id).eq("user_id", user.id);
    return back(request, day, error ? "error" : "saved", error ? "Could+not+remove+quick+add" : "1");
  }
  if (action === "save") {
    const { data: existing } = await supabase.from("quick_adds").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    const { error } = await supabase.from("quick_adds").insert({ user_id: user.id, name, meal, ...values, is_guessed });
    if (error) return back(request, day, "error", "Could+not+save+quick+add");
    if (existing && existing.length >= 20) await supabase.from("quick_adds").delete().eq("user_id", user.id).eq("id", existing[existing.length - 1].id);
    return back(request, day, "saved", "1");
  }
  const { error } = await supabase.from("food_entries").insert({ user_id: user.id, entry_date: day, name, meal, ...values, is_guessed });
  return back(request, day, error ? "error" : "saved", error ? "Could+not+add+food" : "1");
}
