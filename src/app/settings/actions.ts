"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { calculateDailyCaloriePlan, type ActivityLevel, type SexForFormula } from "@/lib/calorie-target";
import { DEMO_COOKIE_MAX_AGE, DEMO_PROFILE_COOKIE, getDemoState } from "@/lib/demo-session";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const ageYears = Number(formData.get("age_years"));
  const sex = String(formData.get("sex") ?? "") as SexForFormula;
  const activityLevel = String(formData.get("activity_level") ?? "") as ActivityLevel;
  const heightCm = Number(formData.get("height_cm"));
  const currentWeightKg = Number(formData.get("current_weight_kg"));
  const goalWeightKg = Number(formData.get("goal_weight_kg"));
  const requestedDurationDays = Number(formData.get("goal_duration_days"));
  const isMaintenanceGoal = goalWeightKg === currentWeightKg;
  const goalDurationDays = isMaintenanceGoal ? 365 : requestedDurationDays;

  if (!Number.isInteger(ageYears) || ageYears < 18 || ageYears > 100 ||
      !["female", "male"].includes(sex) ||
      !["sedentary", "light", "moderate", "active"].includes(activityLevel) ||
      !Number.isFinite(heightCm) || heightCm < 80 || heightCm > 250 ||
      !Number.isFinite(currentWeightKg) || currentWeightKg < 25 || currentWeightKg > 350 ||
      !Number.isFinite(goalWeightKg) || goalWeightKg < 25 || goalWeightKg > 350 ||
      (!isMaintenanceGoal && (!Number.isInteger(goalDurationDays) || goalDurationDays < 14 || goalDurationDays > 3650))) {
    redirect("/settings?error=Check+your+readings+and+try+again");
  }

  const demo = await getDemoState();
  const proteinGramsPerKg = Number(demo.profile?.protein_g_per_kg ?? 1.5);
  const plan = calculateDailyCaloriePlan({
    ageYears,
    sex,
    activityLevel,
    heightCm,
    currentWeightKg,
    goalWeightKg,
    durationDays: goalDurationDays,
    proteinGramsPerKg,
  });

  if (demo.active) {
    if (!demo.profile) redirect("/onboarding");
    const profile = {
      ...demo.profile,
      age_years: ageYears,
      sex,
      activity_level: activityLevel,
      height_cm: heightCm,
      current_weight_kg: currentWeightKg,
      goal_weight_kg: goalWeightKg,
      goal_duration_days: goalDurationDays,
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
    age_years: ageYears,
    sex,
    activity_level: activityLevel,
    height_cm: heightCm,
    current_weight_kg: currentWeightKg,
    goal_weight_kg: goalWeightKg,
    goal_duration_days: goalDurationDays,
    daily_calorie_target: plan.dailyCalorieTarget,
    maintenance_calories: plan.maintenanceCalories,
  }).eq("id", user.id);

  if (error) redirect("/settings?error=Could+not+update+your+profile.+Please+try+again");
  redirect("/profile?profileUpdated=1");
}