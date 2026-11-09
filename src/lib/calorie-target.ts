export type SexForFormula = "female" | "male";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export type CaloriePlanInput = {
  ageYears: number;
  sex: SexForFormula;
  activityLevel: ActivityLevel;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  durationDays: number;
  proteinGramsPerKg?: number;
};

export type CaloriePlan = {
  bmrCalories: number;
  maintenanceCalories: number;
  requestedWeeklyChangeKg: number;
  cappedWeeklyChangeKg: number;
  plannedDailyChangeCalories: number;
  dailySurplusDeficitCalories: number;
  dailyCalorieTarget: number;
  proteinTargetGrams: number;
  proteinGramsPerKg: number;
  estimatedWeeklyWeightChangeKg: number;
  estimatedDaysToGoal: number | null;
  capApplied: boolean;
  capMessage: string | null;
  floorApplied: boolean;
  floorMessage: string | null;
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const LOSS_CALORIE_FLOOR = 1200;
const LOSS_WEEKLY_CHANGE_CAP_KG = 0.75;
const KCAL_PER_KG = 7700;
const GAIN_SURPLUS_CAP_CALORIES = 500;

export function suggestedGoalDurationDays(currentWeightKg: number, goalWeightKg: number): number | null {
  if (!Number.isFinite(currentWeightKg) || !Number.isFinite(goalWeightKg)) return null;
  const differenceKg = Math.abs(goalWeightKg - currentWeightKg);
  if (differenceKg === 0) return null;
  const weeklyCapKg = goalWeightKg > currentWeightKg
    ? GAIN_SURPLUS_CAP_CALORIES * 7 / KCAL_PER_KG
    : LOSS_WEEKLY_CHANGE_CAP_KG;
  return Math.max(14, Math.ceil(differenceKg / weeklyCapKg * 7));
}

export function calculateDailyCaloriePlan(input: CaloriePlanInput): CaloriePlan {
  const {
    ageYears,
    sex,
    activityLevel,
    heightCm,
    currentWeightKg,
    goalWeightKg,
    durationDays,
    proteinGramsPerKg = 1.5,
  } = input;

  // Mifflin-St Jeor estimates resting energy expenditure: 10 x kg + 6.25 x cm - 5 x age, then +5 for male or -161 for female.
  const sexAdjustment = sex === "male" ? 5 : -161;
  const bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * ageYears + sexAdjustment;

  // Estimated maintenance is resting energy multiplied by the selected activity factor.
  const maintenanceCalories = Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);

  const direction = Math.sign(goalWeightKg - currentWeightKg);
  const requestedWeeklyChangeKg = Math.abs(goalWeightKg - currentWeightKg) / durationDays * 7;
  const weeklyCapKg = direction > 0 ? GAIN_SURPLUS_CAP_CALORIES * 7 / KCAL_PER_KG : LOSS_WEEKLY_CHANGE_CAP_KG;
  const cappedWeeklyChangeKg = Math.min(requestedWeeklyChangeKg, weeklyCapKg);
  const capApplied = direction !== 0 && requestedWeeklyChangeKg > weeklyCapKg;

  // A gain adds calories; a loss subtracts them; maintenance has no adjustment.
  const signedWeeklyChangeKg = direction * cappedWeeklyChangeKg;
  let plannedDailyChangeCalories = Math.round((signedWeeklyChangeKg * KCAL_PER_KG) / 7);
  // Keep every positive gain goal above maintenance after whole-calorie rounding.
  if (direction > 0 && plannedDailyChangeCalories === 0) plannedDailyChangeCalories = 1;
  if (direction < 0 && plannedDailyChangeCalories === 0) plannedDailyChangeCalories = -1;
  let dailyCalorieTarget = maintenanceCalories + plannedDailyChangeCalories;
  let floorApplied = false;

  // Apply the calorie floor to loss goals only. Never floor a gain or maintenance goal.
  if (direction < 0 && dailyCalorieTarget < LOSS_CALORIE_FLOOR) {
    dailyCalorieTarget = LOSS_CALORIE_FLOOR;
    floorApplied = true;
  }

  const capMessage = capApplied
    ? `The requested weekly ${direction > 0 ? "gain" : "loss"} was capped at ${Number(weeklyCapKg.toFixed(2))} kg.`
    : null;
  const floorMessage = floorApplied
    ? `The loss target was raised to the ${LOSS_CALORIE_FLOOR.toLocaleString()} kcal/day minimum.`
    : null;
  const estimatedWeeklyWeightChangeKg = (dailyCalorieTarget - maintenanceCalories) * 7 / KCAL_PER_KG;
  const estimatedDaysToGoal = direction !== 0 && Math.sign(estimatedWeeklyWeightChangeKg) === direction
    ? Math.ceil(Math.abs(goalWeightKg - currentWeightKg) / Math.abs(estimatedWeeklyWeightChangeKg) * 7)
    : null;

  return {
    bmrCalories: Math.round(bmr),
    maintenanceCalories,
    requestedWeeklyChangeKg,
    cappedWeeklyChangeKg,
    plannedDailyChangeCalories,
    dailySurplusDeficitCalories: dailyCalorieTarget - maintenanceCalories,
    dailyCalorieTarget,
    proteinTargetGrams: Math.round(currentWeightKg * proteinGramsPerKg),
    proteinGramsPerKg,
    estimatedWeeklyWeightChangeKg,
    estimatedDaysToGoal,
    capApplied,
    capMessage,
    floorApplied,
    floorMessage,
  };
}
