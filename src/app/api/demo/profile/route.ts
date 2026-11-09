import { NextResponse } from "next/server";
import { DEMO_COOKIE_MAX_AGE, DEMO_PROFILE_COOKIE, DEMO_SESSION_COOKIE, getDemoState } from "@/lib/demo-session";
import { calculateProfilePlan } from "@/lib/profile-plan";

export async function POST(request: Request) {
  if (process.env.FITLOG_ENABLE_DEMO !== "true") return new Response("Not found", { status: 404 });
  if (request.headers.get("cookie")?.split(";").some((part) => part.trim() === `${DEMO_SESSION_COOKIE}=1`) !== true) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const calculated = calculateProfilePlan(formData);
  if (!calculated) {
    return NextResponse.redirect(new URL("/onboarding?error=Please+check+your+answers+and+try+again", request.url), 303);
  }

  const { fields, plan } = calculated;
  const existingDemo = await getDemoState();
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
    food_memory_enabled: existingDemo.profile?.food_memory_enabled ?? false,
  };
  const response = NextResponse.redirect(new URL("/today?profileSaved=1", request.url), 303);
  response.cookies.set(DEMO_PROFILE_COOKIE, Buffer.from(JSON.stringify(profile)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: DEMO_COOKIE_MAX_AGE,
  });
  return response;
}
