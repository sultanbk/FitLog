"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { calculateDailyCaloriePlan, type ActivityLevel, type SexForFormula } from "@/lib/calorie-target";
import { DEMO_COOKIE_MAX_AGE, DEMO_PROFILE_COOKIE, getDemoState } from "@/lib/demo-session";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
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
    redirect("/onboarding?error=Please+check+your+answers+and+try+again");
  }
  const caloriePlan = calculateDailyCaloriePlan({
    ageYears, sex, activityLevel, heightCm, currentWeightKg, goalWeightKg, durationDays: goalDurationDays, proteinGramsPerKg: 1.5,
  });
  const demo = await getDemoState();
  if (demo.active) {
    const profile = {
      age_years: ageYears,
      sex,
      activity_level: activityLevel,
      height_cm: heightCm,
      current_weight_kg: currentWeightKg,
      goal_weight_kg: goalWeightKg,
      goal_duration_days: goalDurationDays,
      protein_g_per_kg: 1.5,
      daily_calorie_target: caloriePlan.dailyCalorieTarget,
      maintenance_calories: caloriePlan.maintenanceCalories,
    };
    const cookieStore = await cookies();
    cookieStore.set(DEMO_PROFILE_COOKIE, Buffer.from(JSON.stringify(profile)).toString("base64url"), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: DEMO_COOKIE_MAX_AGE,
    });
    redirect("/today");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    age_years: ageYears,
    sex,
    activity_level: activityLevel,
    height_cm: heightCm,
    current_weight_kg: currentWeightKg,
    goal_weight_kg: goalWeightKg,
    goal_duration_days: goalDurationDays,
    daily_calorie_target: caloriePlan.dailyCalorieTarget,
    maintenance_calories: caloriePlan.maintenanceCalories,
    protein_g_per_kg: 1.5,
  });
  if (error) redirect("/onboarding?error=Could+not+save+your+profile.+Please+try+again");
  redirect("/today");
}
