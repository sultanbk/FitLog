import { NextResponse } from "next/server";
import type { ActivityLevel, SexForFormula } from "@/lib/calorie-target";
import { calculateDailyCaloriePlan } from "@/lib/calorie-target";
import { DEMO_COOKIE_MAX_AGE, DEMO_PROFILE_COOKIE, DEMO_SESSION_COOKIE } from "@/lib/demo-session";

export async function POST(request: Request) {
  if (process.env.FITLOG_ENABLE_DEMO !== "true") return new Response("Not found", { status: 404 });
  if (request.headers.get("cookie")?.split(";").some((part) => part.trim() === `${DEMO_SESSION_COOKIE}=1`) !== true) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
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
    return NextResponse.redirect(new URL("/onboarding?error=Please+check+your+answers+and+try+again", request.url), 303);
  }

  const plan = calculateDailyCaloriePlan({ ageYears, sex, activityLevel, heightCm, currentWeightKg, goalWeightKg, durationDays: goalDurationDays });
  const profile = {
    age_years: ageYears,
    sex,
    activity_level: activityLevel,
    height_cm: heightCm,
    current_weight_kg: currentWeightKg,
    goal_weight_kg: goalWeightKg,
    goal_duration_days: goalDurationDays,
    protein_g_per_kg: 1.5,
    daily_calorie_target: plan.dailyCalorieTarget,
    maintenance_calories: plan.maintenanceCalories,
  };
  const response = NextResponse.redirect(new URL("/today", request.url), 303);
  response.cookies.set(DEMO_PROFILE_COOKIE, Buffer.from(JSON.stringify(profile)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: DEMO_COOKIE_MAX_AGE,
  });
  return response;
}
