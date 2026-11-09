import { calculateDailyCaloriePlan, type ActivityLevel, type CaloriePlan, type SexForFormula } from "./calorie-target.ts";

export type ProfilePlanFields = {
  ageYears: number;
  sex: SexForFormula;
  activityLevel: ActivityLevel;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  goalDurationDays: number;
};

export type CalculatedProfilePlan = {
  fields: ProfilePlanFields;
  plan: CaloriePlan;
};

export function calculateProfilePlan(formData: FormData, proteinGramsPerKg = 1.5): CalculatedProfilePlan | null {
  const ageYears = numberField(formData, "age_years");
  const sex = stringField(formData, "sex");
  const activityLevel = stringField(formData, "activity_level");
  const heightCm = numberField(formData, "height_cm");
  const currentWeightKg = numberField(formData, "current_weight_kg");
  const goalWeightKg = numberField(formData, "goal_weight_kg");
  const requestedDurationDays = numberField(formData, "goal_duration_days");
  const isMaintenanceGoal = goalWeightKg === currentWeightKg;

  if (!Number.isInteger(ageYears) || ageYears < 18 || ageYears > 100 ||
      (sex !== "female" && sex !== "male") ||
      !isActivityLevel(activityLevel) ||
      !Number.isFinite(heightCm) || heightCm < 80 || heightCm > 250 ||
      !Number.isFinite(currentWeightKg) || currentWeightKg < 25 || currentWeightKg > 350 ||
      !Number.isFinite(goalWeightKg) || goalWeightKg < 25 || goalWeightKg > 350 ||
      (!isMaintenanceGoal && (!Number.isInteger(requestedDurationDays) || requestedDurationDays < 14 || requestedDurationDays > 3650)) ||
      !Number.isFinite(proteinGramsPerKg) || proteinGramsPerKg < 1.2 || proteinGramsPerKg > 2) {
    return null;
  }

  const fields: ProfilePlanFields = {
    ageYears,
    sex,
    activityLevel,
    heightCm,
    currentWeightKg,
    goalWeightKg,
    goalDurationDays: isMaintenanceGoal ? 365 : requestedDurationDays,
  };
  return {
    fields,
    plan: calculateDailyCaloriePlan({
      ...fields,
      durationDays: fields.goalDurationDays,
      proteinGramsPerKg,
    }),
  };
}

function numberField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
}

function stringField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isActivityLevel(value: string): value is ActivityLevel {
  return value === "sedentary" || value === "light" || value === "moderate" || value === "active";
}
