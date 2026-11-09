import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE_MAX_AGE, DEMO_PROFILE_COOKIE, getDemoState } from "@/lib/demo-session";

export async function POST(request: Request) {
  const form = await request.formData();
  const enabled = form.get("enabled") === "true";
  const requestedFeature = form.get("feature");
  const feature = requestedFeature === "weekly-reflections" || requestedFeature === "meal-ideas"
    ? requestedFeature
    : "food-parsing";
  const setting = feature === "weekly-reflections"
    ? "gemini_weekly_reflections_enabled"
    : feature === "meal-ideas"
      ? "gemini_meal_ideas_enabled"
      : "gemini_food_parsing_enabled";
  const queryKey = feature === "weekly-reflections" ? "reflection" : feature === "meal-ideas" ? "mealIdeas" : "gemini";
  const demo = process.env.FITLOG_ENABLE_DEMO === "true" ? await getDemoState() : { active: false, profile: null };
  if (process.env.FITLOG_ENABLE_DEMO === "true" && (!demo.active || !demo.profile)) return NextResponse.redirect(new URL("/login", request.url), 303);
  if (demo.active && demo.profile) {
    const response = NextResponse.redirect(new URL(`/profile?${queryKey}=${enabled ? "enabled" : "disabled"}`, request.url), 303);
    response.cookies.set(DEMO_PROFILE_COOKIE, Buffer.from(JSON.stringify({ ...demo.profile, [setting]: enabled })).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: DEMO_COOKIE_MAX_AGE });
    return response;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const { error } = await supabase.from("profiles").update({ [setting]: enabled }).eq("id", user.id);
  return NextResponse.redirect(new URL(`/profile?${queryKey}=${error ? "error" : enabled ? "enabled" : "disabled"}`, request.url), 303);
}