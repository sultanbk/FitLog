import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE_MAX_AGE, DEMO_PROFILE_COOKIE, getDemoState } from "@/lib/demo-session";
import { calculateDailyCaloriePlan } from "@/lib/calorie-target";

export async function POST(request: Request) {
  const form = await request.formData();
  const protein = Number(form.get("protein_g_per_kg"));
  if (!Number.isFinite(protein) || protein < 1.2 || protein > 2 || Math.round(protein * 10) !== protein * 10) return NextResponse.redirect(new URL("/profile?settingsError=Choose+a+value+from+1.2+to+2.0", request.url), 303);
  const demo = await getDemoState();
  if (demo.active && demo.profile) {
    const profile = { ...demo.profile, protein_g_per_kg: protein };
    const response = NextResponse.redirect(new URL("/profile?saved=1", request.url), 303);
    response.cookies.set(DEMO_PROFILE_COOKIE, Buffer.from(JSON.stringify(profile)).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: DEMO_COOKIE_MAX_AGE });
    return response;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const { data: current } = await supabase.from("profiles").select("age_years,sex,activity_level,height_cm,current_weight_kg,goal_weight_kg,goal_duration_days").eq("id", user.id).maybeSingle();
  if (!current) return NextResponse.redirect(new URL("/onboarding", request.url), 303);
  const plan = calculateDailyCaloriePlan({ ageYears: current.age_years, sex: current.sex, activityLevel: current.activity_level, heightCm: Number(current.height_cm), currentWeightKg: Number(current.current_weight_kg), goalWeightKg: Number(current.goal_weight_kg), durationDays: current.goal_duration_days, proteinGramsPerKg: protein });
  const { error } = await supabase.from("profiles").update({ protein_g_per_kg: protein, daily_calorie_target: plan.dailyCalorieTarget, maintenance_calories: plan.maintenanceCalories }).eq("id", user.id);
  return NextResponse.redirect(new URL(error ? "/profile?settingsError=Could+not+save+settings" : "/profile?saved=1", request.url), 303);
}
