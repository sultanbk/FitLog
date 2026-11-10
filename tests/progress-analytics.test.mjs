import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAnalyticsBuckets,
  calendarDays,
  dayInAppTimezone,
  formatBucketLabel,
  getPeriodStart,
  isValidDay,
  isValidMonth,
  shiftMonth,
} from "../src/lib/progress-analytics.ts";

test("calendar dates start on Monday and include only the selected month", () => {
  assert.deepEqual(calendarDays("2026-11").slice(0, 8), [null, null, null, null, null, null, "2026-11-01", "2026-11-02"]);
  assert.equal(calendarDays("2026-11").filter(Boolean).length, 30);
  assert.equal(calendarDays("2026-11").length % 7, 0);
});

test("date and month validation rejects impossible dates", () => {
  assert.equal(isValidDay("2024-02-29"), true);
  assert.equal(isValidDay("2025-02-29"), false);
  assert.equal(isValidMonth("2026-11"), true);
  assert.equal(isValidMonth("2026-13"), false);
});

test("month navigation handles year boundaries", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
});

test("chart labels use stable English date labels", () => {
  assert.equal(formatBucketLabel("week", "2026-11-04"), "Wed 4");
  assert.equal(formatBucketLabel("year", "2026-11"), "Nov");
});

test("period starts use rolling weeks and months and twelve calendar months", () => {
  assert.equal(getPeriodStart("week", "2026-11-10"), "2026-11-04");
  assert.equal(getPeriodStart("month", "2026-11-10"), "2026-10-12");
  assert.equal(getPeriodStart("year", "2026-11-10"), "2025-12-01");
});

test("weight log dates are interpreted in the app timezone", () => {
  assert.equal(dayInAppTimezone("2026-01-01T21:00:00.000Z"), "2026-01-02");
});

test("daily analytics preserve empty days and sum logged records", () => {
  const buckets = buildAnalyticsBuckets("week", "2026-11-10", [
    { entry_date: "2026-11-04", calories: 1200, protein_g: 55, is_guessed: true },
    { entry_date: "2026-11-04", calories: 500, protein_g: 20 },
  ], [
    { entry_date: "2026-11-10", repetitions: 9 },
  ], []);
  assert.equal(buckets.length, 7);
  assert.equal(buckets[0].key, "2026-11-04");
  assert.equal(buckets[0].calories, 1700);
  assert.equal(buckets[0].foodDays, 1);
  assert.equal(buckets[0].foodEntries, 2);
  assert.equal(buckets[0].guessedFoodEntries, 1);
  assert.equal(buckets[1].foodDays, 0);
  assert.equal(buckets[6].pushUps, 9);
});

test("year analytics aggregate daily logs into months and preserve missing weight periods", () => {
  const buckets = buildAnalyticsBuckets("year", "2026-11-10", [
    { entry_date: "2026-01-03", calories: 1800, protein_g: 70, is_guessed: true },
    { entry_date: "2026-01-03", calories: 400, protein_g: 15 },
    { entry_date: "2026-03-10", calories: 2100, protein_g: 90 },
  ], [
    { entry_date: "2026-01-03", repetitions: 12 },
    { entry_date: "2026-03-10", repetitions: 8 },
  ], [
    { date: "2026-01-03", weight_kg: 70, created_at: "2026-01-03T08:00:00Z" },
    { date: "2026-01-20", weight_kg: 72, created_at: "2026-01-20T08:00:00Z" },
  ]);
  assert.equal(buckets.length, 12);
  const january = buckets.find((bucket) => bucket.key === "2026-01");
  assert.ok(january);
  assert.deepEqual(
    { calories: january.calories, protein: january.protein, foodDays: january.foodDays, foodEntries: january.foodEntries, guessedFoodEntries: january.guessedFoodEntries, pushUps: january.pushUps, exerciseDays: january.exerciseDays, averageWeight: january.averageWeight, weighInCount: january.weighInCount },
    { calories: 2200, protein: 85, foodDays: 1, foodEntries: 2, guessedFoodEntries: 1, pushUps: 12, exerciseDays: 1, averageWeight: 71, weighInCount: 2 },
  );
  assert.equal(buckets.find((bucket) => bucket.key === "2026-02")?.averageWeight, null);
  assert.equal(buckets.find((bucket) => bucket.key === "2026-03")?.calories, 2100);
});
