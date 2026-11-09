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
  assert.equal(plan.dailySurplusDeficitCalories, 550);
  assert.equal(plan.cappedWeeklyChangeKg, 0.5);
  assert.equal(plan.capApplied, true);
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
});

test("maintain goal uses maintenance without a surplus or deficit", () => {
  const plan = calculateDailyCaloriePlan({ ...base, goalWeightKg: 61 });

  assert.equal(plan.dailyCalorieTarget, plan.maintenanceCalories);
  assert.equal(plan.dailySurplusDeficitCalories, 0);
});
