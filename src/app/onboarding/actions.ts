"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DEMO_COOKIE_MAX_AGE, DEMO_PROFILE_COOKIE, getDemoState } from "@/lib/demo-session";
import { calculateProfilePlan } from "@/lib/profile-plan";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const calculated = calculateProfilePlan(formData);
  if (!calculated) {
    redirect("/onboarding?error=Please+check+your+answers+and+try+again");
  }
  const { fields, plan } = calculated;
  const demo = await getDemoState();
  if (demo.active) {
    const profile = {
      age_years: fields.ageYears,
      sex: fields.sex,
      activity_level: fields.activityLevel,
      height_cm: fields.heightCm,
      current_weight_kg: fields.currentWeightKg,
      goal_weight_kg: fields.goalWeightKg,
      goal_duration_days: fields.goalDurationDays,
      protein_g_per_kg: 1.5,
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
    redirect("/today?profileSaved=1");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    age_years: fields.ageYears,
    sex: fields.sex,
    activity_level: fields.activityLevel,
    height_cm: fields.heightCm,
    current_weight_kg: fields.currentWeightKg,
    goal_weight_kg: fields.goalWeightKg,
    goal_duration_days: fields.goalDurationDays,
    daily_calorie_target: plan.dailyCalorieTarget,
    maintenance_calories: plan.maintenanceCalories,
    protein_g_per_kg: 1.5,
  });
  if (error) redirect("/onboarding?error=Could+not+save+your+profile.+Please+try+again");
  redirect("/today?profileSaved=1");
}
