import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE_MAX_AGE, DEMO_FOOD_ENTRIES_COOKIE, DEMO_SESSION_COOKIE, getDemoFoodEntries } from "@/lib/demo-session";

const meals = ["breakfast", "lunch", "snack", "dinner"] as const;
const numeric = ["calories", "protein_g", "carbs_g", "fat_g"] as const;
function redirect(request: Request, day: string, key: string, value: string) {
  const url = new URL("/today", request.url); url.searchParams.set("day", day); url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}
function validDay(day: string) { return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`)); }

export async function POST(request: Request) {
  const form = await request.formData();
  const day = String(form.get("entry_date") ?? "");
  const action = String(form.get("action") ?? "save");
  const id = String(form.get("id") ?? "");
  if (!validDay(day)) return redirect(request, new Date().toISOString().slice(0, 10), "error", "Invalid+date");
  const isDemo = process.env.FITLOG_ENABLE_DEMO === "true" && request.headers.get("cookie")?.split(";").some((part) => part.trim() === `${DEMO_SESSION_COOKIE}=1`);
  if (isDemo) {
    const entries = await getDemoFoodEntries();
    let next = entries;
    if (action === "delete") next = entries.filter((entry) => entry.id !== id);
    else {
      const name = String(form.get("name") ?? "").trim(); const meal = String(form.get("meal") ?? "");
      const values = Object.fromEntries(numeric.map((key) => [key, Number(form.get(key))])) as Record<(typeof numeric)[number], number>;
      if (name.length < 1 || name.length > 100 || !meals.includes(meal as typeof meals[number]) || numeric.some((key) => !Number.isFinite(values[key]) || values[key] < 0 || values[key] > (key === "calories" ? 20000 : 1000)) || !Number.isInteger(values.calories)) return redirect(request, day, "error", "Check+the+food+details");
      const item = { id: id || randomUUID(), entry_date: day, name, meal: meal as typeof meals[number], ...values, is_guessed: form.get("is_guessed") === "true", created_at: new Date().toISOString() };
      next = id ? entries.map((entry) => entry.id === id ? item : entry) : [item, ...entries].slice(0, 20);
    }
    const cookieStore = await cookies();
    cookieStore.set(DEMO_FOOD_ENTRIES_COOKIE, Buffer.from(JSON.stringify(next)).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: DEMO_COOKIE_MAX_AGE });
    return redirect(request, day, "saved", "1");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  if (action === "delete") {
    const { error } = await supabase.from("food_entries").delete().eq("id", id).eq("user_id", user.id);
    return redirect(request, day, error ? "error" : "saved", error ? "Could+not+delete+item" : "1");
  }
  const name = String(form.get("name") ?? "").trim(); const meal = String(form.get("meal") ?? "");
  const values = Object.fromEntries(numeric.map((key) => [key, Number(form.get(key))])) as Record<(typeof numeric)[number], number>;
  if (name.length < 1 || name.length > 100 || !meals.includes(meal as typeof meals[number]) || numeric.some((key) => !Number.isFinite(values[key]) || values[key] < 0 || values[key] > (key === "calories" ? 20000 : 1000)) || !Number.isInteger(values.calories)) return redirect(request, day, "error", "Check+the+food+details");
  const item = { entry_date: day, name, meal, ...values, is_guessed: form.get("is_guessed") === "true" };
  const result = id
    ? await supabase.from("food_entries").update(item).eq("id", id).eq("user_id", user.id)
    : await supabase.from("food_entries").insert({ ...item, user_id: user.id });
  return redirect(request, day, result.error ? "error" : "saved", result.error ? "Could+not+save+food+entry" : "1");
}
