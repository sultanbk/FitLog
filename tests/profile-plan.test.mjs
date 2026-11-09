import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateDailyCaloriePlan } from "../src/lib/calorie-target.ts";
import { calculateProfilePlan } from "../src/lib/profile-plan.ts";

function profileForm(overrides = {}) {
  const values = {
    age_years: "30",
    sex: "female",
    activity_level: "sedentary",
    height_cm: "170",
    current_weight_kg: "65",
    goal_weight_kg: "61",
    goal_duration_days: "25",
    ...overrides,
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

test("shared profile parsing returns canonical fields and the expected calorie plan", () => {
  const result = calculateProfilePlan(profileForm());
  assert.ok(result);
  assert.deepEqual(result.fields, {
    ageYears: 30,
    sex: "female",
    activityLevel: "sedentary",
    heightCm: 170,
    currentWeightKg: 65,
    goalWeightKg: 61,
    goalDurationDays: 25,
  });
  assert.deepEqual(result.plan, calculateDailyCaloriePlan({
    ageYears: 30,
    sex: "female",
    activityLevel: "sedentary",
    heightCm: 170,
    currentWeightKg: 65,
    goalWeightKg: 61,
    durationDays: 25,
    proteinGramsPerKg: 1.5,
  }));
});

test("shared profile parsing normalizes maintenance goals to the existing one-year value", () => {
  const result = calculateProfilePlan(profileForm({
    current_weight_kg: "65",
    goal_weight_kg: "65",
    goal_duration_days: "",
  }));
  assert.ok(result);
  assert.equal(result.fields.goalDurationDays, 365);
  assert.equal(result.plan.dailyCalorieTarget, result.plan.maintenanceCalories);
});

test("shared profile parsing rejects invalid and missing fields consistently", () => {
  for (const overrides of [
    { age_years: "17" },
    { age_years: "30.5" },
    { sex: "other" },
    { activity_level: "extreme" },
    { height_cm: "251" },
    { current_weight_kg: "24.9" },
    { goal_weight_kg: "351" },
    { goal_duration_days: "13" },
    { goal_duration_days: "14.5" },
    { goal_duration_days: "3651" },
    { age_years: "" },
  ]) {
    assert.equal(calculateProfilePlan(profileForm(overrides)), null, JSON.stringify(overrides));
  }
});

test("shared profile parsing accepts every supported activity and sex option", () => {
  for (const sex of ["female", "male"]) {
    for (const activity_level of ["sedentary", "light", "moderate", "active"]) {
      assert.ok(calculateProfilePlan(profileForm({ sex, activity_level })));
    }
  }
});

test("shared profile calculation validates and applies the saved protein preference", () => {
  const result = calculateProfilePlan(profileForm(), 1.8);
  assert.ok(result);
  assert.equal(result.plan.proteinGramsPerKg, 1.8);
  assert.equal(result.plan.proteinTargetGrams, Math.round(65 * 1.8));
  assert.equal(calculateProfilePlan(profileForm(), 2.1), null);
});
