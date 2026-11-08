"use server";

import { redirect } from "next/navigation";
import { calculateDailyCalorieTarget } from "@/lib/calorie-target";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const heightCm = Number(formData.get("height_cm"));
  const currentWeightKg = Number(formData.get("current_weight_kg"));
  const goalWeightKg = Number(formData.get("goal_weight_kg"));
  const goalDurationDays = Number(formData.get("goal_duration_days"));
  if (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 250 ||
      !Number.isFinite(currentWeightKg) || currentWeightKg < 25 || currentWeightKg > 350 ||
      !Number.isFinite(goalWeightKg) || goalWeightKg < 25 || goalWeightKg > 350 ||
      !Number.isInteger(goalDurationDays) || goalDurationDays < 14 || goalDurationDays > 3650) {
    redirect("/onboarding?error=Please+check+your+answers+and+try+again");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dailyCalorieTarget = calculateDailyCalorieTarget(currentWeightKg, goalWeightKg, goalDurationDays);
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    height_cm: heightCm,
    current_weight_kg: currentWeightKg,
    goal_weight_kg: goalWeightKg,
    goal_duration_days: goalDurationDays,
    daily_calorie_target: dailyCalorieTarget,
  });
  if (error) redirect("/onboarding?error=Could+not+save+your+profile.+Please+try+again");
  redirect("/dashboard");
}
