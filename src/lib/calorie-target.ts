/**
 * A deliberately simple, editable estimate. It assumes maintenance calories
 * of 25 kcal per kg of current body weight and uses 7,700 kcal per kg of
 * weight change. The planned weekly change is capped at 0.5 kg.
 */
export function calculateDailyCalorieTarget(
  currentWeightKg: number,
  goalWeightKg: number,
  durationDays: number,
): number {
  const maintenanceEstimate = 25 * currentWeightKg;
  const weeklyChangeKg = Math.abs(goalWeightKg - currentWeightKg) / durationDays * 7;
  const cappedWeeklyChangeKg = Math.min(weeklyChangeKg, 0.5);
  const cappedDailyChangeKg = cappedWeeklyChangeKg / 7;
  const direction = Math.sign(goalWeightKg - currentWeightKg);
  const target = maintenanceEstimate - direction * cappedDailyChangeKg * 7700;

  return Math.round(Math.max(1200, target));
}
