import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE_MAX_AGE, DEMO_FOOD_MEMORY_COOKIE, DEMO_PROFILE_COOKIE, getDemoFoodMemories, getDemoState, type FoodMemory } from "@/lib/demo-session";

function back(request: Request, value: string) {
  const url = new URL("/profile", request.url); url.searchParams.set("memoryMessage", value); url.hash = "food-memory";
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const demo = process.env.FITLOG_ENABLE_DEMO === "true" ? await getDemoState() : { active: false, profile: null };
  if (process.env.FITLOG_ENABLE_DEMO === "true" && (!demo.active || !demo.profile)) return NextResponse.redirect(new URL("/login", request.url), 303);

  if (demo.active && demo.profile) {
    const cookieStore = await cookies();
    if (action === "toggle") {
      const profile = { ...demo.profile, food_memory_enabled: form.get("enabled") === "true" };
      cookieStore.set(DEMO_PROFILE_COOKIE, Buffer.from(JSON.stringify(profile)).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: DEMO_COOKIE_MAX_AGE });
      return back(request, profile.food_memory_enabled ? "enabled" : "disabled");
    }
    const memories = await getDemoFoodMemories();
    const id = String(form.get("id") ?? "");
    if (action === "delete") {
      const next = memories.filter((memory) => memory.id !== id);
      cookieStore.set(DEMO_FOOD_MEMORY_COOKIE, Buffer.from(JSON.stringify(next)).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: DEMO_COOKIE_MAX_AGE });
      return back(request, "deleted");
    }
    if (action === "clear") {
      cookieStore.delete(DEMO_FOOD_MEMORY_COOKIE);
      return back(request, "cleared");
    }
    if (action === "save") {
      const item = validate(form);
      if (!item) return back(request, "invalid");
      const existing = memories.find((memory) => memory.id === id);
      const nextItem: FoodMemory = { ...item, id: existing?.id ?? randomUUID(), updated_at: new Date().toISOString() };
      const next = existing ? memories.map((memory) => memory.id === id ? nextItem : memory) : [nextItem, ...memories];
      cookieStore.set(DEMO_FOOD_MEMORY_COOKIE, Buffer.from(JSON.stringify(next.slice(0, 8))).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: DEMO_COOKIE_MAX_AGE });
      return back(request, "saved");
    }
    return back(request, "invalid");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  if (action === "toggle") {
    const enabled = form.get("enabled") === "true";
    const { error } = await supabase.from("profiles").update({ food_memory_enabled: enabled }).eq("id", user.id);
    return back(request, error ? "error" : enabled ? "enabled" : "disabled");
  }
  if (action === "clear") {
    const { error } = await supabase.from("food_memory").delete().eq("user_id", user.id);
    return back(request, error ? "error" : "cleared");
  }
  const id = String(form.get("id") ?? "");
  if (action === "delete") {
    const { error } = await supabase.from("food_memory").delete().eq("id", id).eq("user_id", user.id);
    return back(request, error ? "error" : "deleted");
  }
  if (action === "save") {
    const item = validate(form);
    if (!item) return back(request, "invalid");
    const canonical_name = item.name.toLocaleLowerCase().trim().replace(/\s+/g, " ");
    const canonical_serving = item.serving_description.toLocaleLowerCase().trim().replace(/\s+/g, " ");
    const { error } = id
      ? await supabase.from("food_memory").update({ ...item, canonical_name, canonical_serving, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id)
      : await supabase.from("food_memory").upsert({ ...item, user_id: user.id, canonical_name, canonical_serving }, { onConflict: "user_id,canonical_name,canonical_serving" });
    return back(request, error ? "error" : "saved");
  }
  return back(request, "invalid");
}

function validate(form: FormData): Omit<FoodMemory, "id" | "updated_at"> | null {
  const name = String(form.get("name") ?? "").trim();
  const serving_description = String(form.get("serving_description") ?? "").trim();
  const calories = Number(form.get("calories"));
  const protein_g = Number(form.get("protein_g"));
  const carbs_g = Number(form.get("carbs_g"));
  const fat_g = Number(form.get("fat_g"));
  if (!name || name.length > 100 || !serving_description || serving_description.length > 100 || !Number.isInteger(calories) || calories < 0 || calories > 20000 || [protein_g, carbs_g, fat_g].some((value) => !Number.isFinite(value) || value < 0 || value > 1000)) return null;
  return { name, serving_description, calories, protein_g, carbs_g, fat_g };
}
