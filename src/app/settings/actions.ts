"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE_MAX_AGE, DEMO_PROFILE_COOKIE, getDemoState } from "@/lib/demo-session";
import { calculateProfilePlan } from "@/lib/profile-plan";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const demo = await getDemoState();
  const proteinGramsPerKg = Number(demo.profile?.protein_g_per_kg ?? 1.5);
  const calculated = calculateProfilePlan(formData, proteinGramsPerKg);
  if (!calculated) {
    redirect("/settings/profile?error=Check+your+readings+and+try+again");
  }
  const { fields, plan } = calculated;

  if (demo.active) {
    if (!demo.profile) redirect("/onboarding");
    const profile = {
      ...demo.profile,
      age_years: fields.ageYears,
      sex: fields.sex,
      activity_level: fields.activityLevel,
      height_cm: fields.heightCm,
      current_weight_kg: fields.currentWeightKg,
      goal_weight_kg: fields.goalWeightKg,
      goal_duration_days: fields.goalDurationDays,
      daily_calorie_target: plan.dailyCalorieTarget,
      maintenance_calories: plan.maintenanceCalories,
    };
    const cookieStore = await cookies();
    cookieStore.set(DEMO_PROFILE_COOKIE, Buffer.from(JSON.stringify(profile)).toString("base64url"), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: DEMO_COOKIE_MAX_AGE,
    });
    redirect("/profile?profileUpdated=1");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("profiles").update({
    age_years: fields.ageYears,
    sex: fields.sex,
    activity_level: fields.activityLevel,
    height_cm: fields.heightCm,
    current_weight_kg: fields.currentWeightKg,
    goal_weight_kg: fields.goalWeightKg,
    goal_duration_days: fields.goalDurationDays,
    daily_calorie_target: plan.dailyCalorieTarget,
    maintenance_calories: plan.maintenanceCalories,
  }).eq("id", user.id);

  if (error) redirect("/settings/profile?error=Could+not+update+your+profile.+Please+try+again");
  redirect("/profile?profileUpdated=1");
}