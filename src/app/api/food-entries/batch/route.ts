import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE_MAX_AGE, DEMO_FOOD_ENTRIES_COOKIE, DEMO_FOOD_MEMORY_COOKIE, DEMO_SESSION_COOKIE, getDemoFoodEntries, getDemoFoodMemories, getDemoState } from "@/lib/demo-session";

const meals = ["breakfast", "lunch", "snack", "dinner"];
function validItem(item: unknown): item is { name: string; serving_description: string; meal: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; is_guessed: boolean; remember: boolean } {
  if (!item || typeof item !== "object") return false;
  const value = item as Record<string, unknown>;
  const fields = ["name", "serving_description", "meal", "calories", "protein_g", "carbs_g", "fat_g", "is_guessed", "remember"];
  if (Object.keys(value).length !== fields.length || !fields.every((field) => Object.hasOwn(value, field))) return false;
  return typeof value.name === "string" && value.name.trim().length > 0 && value.name.trim().length <= 70 && typeof value.serving_description === "string" && value.serving_description.trim().length > 0 && value.serving_description.length <= 30 && value.name.trim().length + value.serving_description.trim().length + 3 <= 100 && meals.includes(String(value.meal)) &&
    Number.isInteger(value.calories) && Number(value.calories) >= 0 && Number(value.calories) <= 20000 &&
    [value.protein_g, value.carbs_g, value.fat_g].every((number) => typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= 1000) &&
    typeof value.is_guessed === "boolean" && typeof value.remember === "boolean" && (!value.remember || !value.is_guessed);
}

export async function POST(request: Request) {
  let body: { entry_date?: unknown; items?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid food entry data." }, { status: 400 }); }
  const day = body.entry_date;
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`)) || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30 || !body.items.every(validItem)) return NextResponse.json({ error: "Check the food details and try again." }, { status: 400 });
  const isDemo = process.env.NODE_ENV !== "production";
  if (isDemo) {
    const demo = await getDemoState();
    if (!demo.active || !demo.profile) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    if (request.headers.get("cookie")?.split(";").some((part) => part.trim() === `${DEMO_SESSION_COOKIE}=1`) !== true) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    if (body.items.some((item) => (item as { remember: boolean }).remember) && demo.profile.food_memory_enabled !== true) return NextResponse.json({ error: "Turn on food memory in Profile before remembering a food." }, { status: 400 });
    const existing = await getDemoFoodEntries();
    const timestamp = new Date().toISOString();
    const next = [...body.items.map((item) => {
      const food = item as { name: string; serving_description: string; remember: boolean; [key: string]: unknown };
      const { serving_description, remember: _remember, ...entry } = food;
      return { ...entry, name: `${food.name.trim()} (${serving_description.trim()})`, id: randomUUID(), entry_date: day, created_at: timestamp };
    }), ...existing].slice(0, 20);
    const cookieStore = await cookies();
    cookieStore.set(DEMO_FOOD_ENTRIES_COOKIE, Buffer.from(JSON.stringify(next)).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: DEMO_COOKIE_MAX_AGE });
    const selected = body.items.filter((item) => (item as { remember: boolean }).remember) as Array<{ name: string; serving_description: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }>;
    if (selected.length) {
      const previous = await getDemoFoodMemories();
      const nextMemories = [...previous];
      for (const item of selected) {
        const canonical = item.name.trim().toLocaleLowerCase();
        const memory = { id: randomUUID(), name: item.name.trim(), serving_description: item.serving_description.trim(), calories: item.calories, protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g, updated_at: timestamp };
        const found = nextMemories.findIndex((saved) => saved.name.toLocaleLowerCase() === canonical);
        if (found >= 0) nextMemories[found] = { ...memory, id: nextMemories[found].id };
        else nextMemories.unshift(memory);
      }
      cookieStore.set(DEMO_FOOD_MEMORY_COOKIE, Buffer.from(JSON.stringify(nextMemories.slice(0, 8))).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: DEMO_COOKIE_MAX_AGE });
    }
    return NextResponse.json({ ok: true });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const selected = body.items.filter((item) => (item as { remember: boolean }).remember) as Array<{ name: string; serving_description: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }>;
  if (selected.length) {
    const { data: profile } = await supabase.from("profiles").select("food_memory_enabled").eq("id", user.id).maybeSingle();
    if (!profile?.food_memory_enabled) return NextResponse.json({ error: "Turn on food memory in Profile before remembering a food." }, { status: 400 });
  }
  const values = body.items.map((item) => {
    const food = item as { name: string; serving_description: string; remember: boolean; [key: string]: unknown };
    const { serving_description, remember: _remember, ...entry } = food;
    return { ...entry, name: `${food.name.trim()} (${serving_description.trim()})`, entry_date: day, user_id: user.id };
  });
  const { error } = await supabase.from("food_entries").insert(values);
  if (error) return NextResponse.json({ error: "Could not save the food entries. Please try again." }, { status: 500 });
  if (selected.length) {
    const byName = new Map(selected.map((item) => [item.name.trim().toLocaleLowerCase(), item]));
    const memories = [...byName.values()].map((item) => ({ user_id: user.id, name: item.name.trim(), canonical_name: item.name.trim().toLocaleLowerCase(), serving_description: item.serving_description.trim(), calories: item.calories, protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g, updated_at: new Date().toISOString() }));
    const { error: memoryError } = await supabase.from("food_memory").upsert(memories, { onConflict: "user_id,canonical_name" });
    if (memoryError) return NextResponse.json({ ok: true, memoryWarning: "Food was logged, but the remembered item could not be saved." });
  }
  return NextResponse.json({ ok: true });
}
