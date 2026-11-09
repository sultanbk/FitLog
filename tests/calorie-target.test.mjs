import assert from "node:assert/strict";
import test from "node:test";
import { calculateDailyCaloriePlan } from "../src/lib/calorie-target.ts";

const base = {
  ageYears: 30,
  sex: "female",
  activityLevel: "sedentary",
  heightCm: 170,
  currentWeightKg: 61,
  durationDays: 40,
};

test("gain goal adds a capped surplus above maintenance", () => {
  const plan = calculateDailyCaloriePlan({ ...base, goalWeightKg: 65 });

  assert.ok(plan.dailyCalorieTarget > plan.maintenanceCalories);
  assert.equal(plan.dailySurplusDeficitCalories, 500);
  assert.equal(plan.cappedWeeklyChangeKg, 500 * 7 / 7700);
  assert.equal(plan.capApplied, true);
  assert.ok(plan.estimatedWeeklyWeightChangeKg > 0);
  assert.equal(plan.estimatedDaysToGoal, Math.ceil(4 / (500 * 7 / 7700) * 7));
});

test("a gain goal does not use the loss calorie floor", () => {
  const plan = calculateDailyCaloriePlan({
    ageYears: 18,
    sex: "female",
    activityLevel: "sedentary",
    heightCm: 120,
    currentWeightKg: 25,
    goalWeightKg: 25.1,
    durationDays: 3650,
  });

  assert.ok(plan.dailyCalorieTarget > plan.maintenanceCalories);
  assert.ok(plan.dailyCalorieTarget < 1200);
  assert.equal(plan.floorApplied, false);
});

test("loss goal subtracts calories from maintenance", () => {
  const plan = calculateDailyCaloriePlan({ ...base, currentWeightKg: 65, goalWeightKg: 61, durationDays: 25 });

  assert.ok(plan.dailyCalorieTarget < plan.maintenanceCalories);
  assert.equal(plan.plannedDailyChangeCalories, -825);
  assert.equal(plan.cappedWeeklyChangeKg, 0.75);
  assert.equal(plan.capApplied, true);
  assert.equal(plan.dailyCalorieTarget, 1200);
  assert.equal(plan.dailySurplusDeficitCalories, -482);
  assert.equal(plan.floorApplied, true);
  assert.equal(plan.estimatedWeeklyWeightChangeKg, -482 * 7 / 7700);
  assert.equal(plan.estimatedDaysToGoal, Math.ceil(4 / (482 * 7 / 7700) * 7));
});

test("a loss calorie floor lowers the projected pace and extends the goal timeline", () => {
  const plan = calculateDailyCaloriePlan({ ...base, currentWeightKg: 65, goalWeightKg: 61, durationDays: 25 });

  assert.equal(plan.floorApplied, true);
  assert.ok(Math.abs(plan.estimatedWeeklyWeightChangeKg) < plan.cappedWeeklyChangeKg);
  const oldCappedTimeline = Math.ceil(4 / plan.cappedWeeklyChangeKg * 7);
  assert.ok(plan.estimatedDaysToGoal > oldCappedTimeline);
});

test("a capped loss goal without the calorie floor uses its final calorie-target pace", () => {
  const plan = calculateDailyCaloriePlan({
    ...base,
    activityLevel: "active",
    currentWeightKg: 65,
    goalWeightKg: 61,
    durationDays: 25,
  });

  assert.equal(plan.capApplied, true);
  assert.equal(plan.floorApplied, false);
  assert.equal(plan.estimatedWeeklyWeightChangeKg, plan.dailySurplusDeficitCalories * 7 / 7700);
  assert.equal(plan.estimatedDaysToGoal, Math.ceil(4 / Math.abs(plan.estimatedWeeklyWeightChangeKg) * 7));
});

test("a calorie floor above estimated maintenance does not claim progress toward a loss goal", () => {
  const plan = calculateDailyCaloriePlan({
    ageYears: 18,
    sex: "female",
    activityLevel: "sedentary",
    heightCm: 120,
    currentWeightKg: 25,
    goalWeightKg: 20,
    durationDays: 365,
  });

  assert.equal(plan.floorApplied, true);
  assert.ok(plan.estimatedWeeklyWeightChangeKg > 0);
  assert.equal(plan.estimatedDaysToGoal, null);
});

test("maintain goal uses maintenance without a surplus or deficit", () => {
  const plan = calculateDailyCaloriePlan({ ...base, goalWeightKg: 61 });

  assert.equal(plan.dailyCalorieTarget, plan.maintenanceCalories);
  assert.equal(plan.dailySurplusDeficitCalories, 0);
  assert.equal(plan.estimatedWeeklyWeightChangeKg, 0);
  assert.equal(plan.estimatedDaysToGoal, null);
});
