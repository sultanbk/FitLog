import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWeeklyReflectionSummary, isWeeklyReflection } from "../src/lib/weekly-reflection.ts";

test("weekly reflection sends only seven-day aggregates after enough logged days", () => {
  const summary = buildWeeklyReflectionSummary("2026-11-10", [
    { entry_date: "2026-11-04", calories: 1800, protein_g: 80 },
    { entry_date: "2026-11-04", calories: 200, protein_g: 10 },
    { entry_date: "2026-11-06", calories: 1900, protein_g: 90 },
    { entry_date: "2026-11-08", calories: 1700, protein_g: 75 },
    { entry_date: "2026-11-10", calories: 2100, protein_g: 100 },
    { entry_date: "2026-11-03", calories: 3000, protein_g: 200 },
    { entry_date: "invalid", calories: 3000, protein_g: 200 },
  ], [
    { entry_date: "2026-11-05", repetitions: 20 },
    { entry_date: "2026-11-08", repetitions: 15 },
  ]);
  assert.deepEqual(summary, {
    foodDaysLogged: 4,
    exerciseDaysLogged: 2,
    totalPushUps: 35,
    averageCaloriesOnFoodDays: 1925,
    averageProteinOnFoodDays: 89,
    foodLoggingByWeekday: { sun: 1, mon: 0, tue: 1, wed: 1, thu: 0, fri: 1, sat: 0 },
    exerciseLoggingByWeekday: { sun: 1, mon: 0, tue: 0, wed: 0, thu: 1, fri: 0, sat: 0 },
  });
  assert.equal("name" in summary, false);
});

test("weekly reflection asks for more logs when fewer than four distinct days are available", () => {
  assert.equal(buildWeeklyReflectionSummary("2026-11-10", [
    { entry_date: "2026-11-09", calories: 1800, protein_g: 80 },
  ], [
    { entry_date: "2026-11-09", repetitions: 20 },
    { entry_date: "2026-11-08", repetitions: 15 },
    { entry_date: "2026-11-07", repetitions: 10 },
  ]), null);
});

test("Gemini reflection must match the exact short-text response shape", () => {
  assert.equal(isWeeklyReflection({
    recap: "You logged food on four days.",
    pattern: "Most food logging happened on weekends.",
    tryNextWeek: "If useful, try a short midweek check-in.",
  }), true);
  assert.equal(isWeeklyReflection({ recap: "Good", pattern: "Good", tryNextWeek: "Good", extra: true }), false);
  assert.equal(isWeeklyReflection({ recap: "x", pattern: "Good", tryNextWeek: "Good" }), false);
});
