import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  buildCoachContext,
  COACH_REQUESTS_PER_HOUR,
  COACH_SYSTEM_INSTRUCTION,
  isCoachMessages,
  isCoachReply,
} from "../src/lib/coach.ts";

const profile = {
  age_years: 32,
  sex: "female",
  activity_level: "moderate",
  height_cm: 165,
  current_weight_kg: 68,
  goal_weight_kg: 65,
  goal_duration_days: 180,
  daily_calorie_target: 1900,
  protein_g_per_kg: 1.5,
};

test("Coach context includes today's entries and only aggregate food trends", () => {
  const context = buildCoachContext("2026-11-10", profile, [
    { entry_date: "2026-11-10", name: "Rice and dal", meal: "lunch", calories: 550, protein_g: 20, carbs_g: 80, fat_g: 12, is_guessed: false },
    { entry_date: "2026-11-09", name: "Yesterday meal", meal: "dinner", calories: 700, protein_g: 25, carbs_g: 90, fat_g: 20, is_guessed: true },
    { entry_date: "2026-11-03", name: "Outside week", meal: "snack", calories: 900, protein_g: 30, carbs_g: 100, fat_g: 25, is_guessed: false },
  ], [
    { entry_date: "2026-11-10", repetitions: 18 },
    { entry_date: "2026-11-09", repetitions: 12 },
    { entry_date: "2026-11-03", repetitions: 99 },
  ], [
    { weight_kg: 68.2, created_at: "2026-10-27T04:00:00.000Z" },
    { weight_kg: 68, created_at: "2026-11-10T04:00:00.000Z" },
  ]);
  assert.deepEqual(context.today, {
    date: "2026-11-10",
    food: [{ name: "Rice and dal", meal: "lunch", calories: 550, protein_g: 20, carbs_g: 80, fat_g: 12, isGuessed: false }],
    pushUps: 18,
  });
  assert.deepEqual(context.recentTrends.sevenDays, [
    { date: "2026-11-09", calories: 700, protein_g: 25, foodEntries: 1, pushUps: 12 },
    { date: "2026-11-10", calories: 550, protein_g: 20, foodEntries: 1, pushUps: 18 },
  ]);
  assert.deepEqual(context.recentTrends.weighIns, [{ date: "2026-11-10", weight_kg: 68 }]);
  assert.equal(JSON.stringify(context.recentTrends).includes("Yesterday meal"), false);
  assert.equal(JSON.stringify(context.recentTrends).includes("Outside week"), false);
});

test("Coach accepts bounded conversations ending in a user message", () => {
  assert.equal(isCoachMessages([{ role: "user", content: "How is my protein today?" }]), true);
  assert.equal(isCoachMessages([
    { role: "user", content: "How is my protein today?" },
    { role: "assistant", content: "You logged 20 grams." },
    { role: "user", content: "What about the week?" },
  ]), true);
  assert.equal(isCoachMessages([{ role: "assistant", content: "A reply without a question" }]), false);
  assert.equal(isCoachMessages([{ role: "user", content: "x".repeat(1201) }]), false);
  assert.equal(isCoachMessages(Array.from({ length: 13 }, () => ({ role: "user", content: "Hi" }))), false);
});

test("Coach reply validation rejects empty and oversized responses", () => {
  assert.equal(isCoachReply("Your recent entries show a few consistent days."), true);
  assert.equal(isCoachReply(" "), false);
  assert.equal(isCoachReply("x".repeat(1601)), false);
});

test("Coach context clearly marks missing and guessed records", () => {
  const missing = buildCoachContext("2026-11-10", profile, [], [], []);
  assert.equal(missing.dataQuality.hasTodayFood, false);
  assert.equal(missing.dataQuality.hasTodayExercise, false);
  assert.equal(missing.dataQuality.foodDaysLogged, 0);
  assert.match(missing.evidence[0].value, /No food entries/);
  assert.match(missing.evidence[2].value, /0\/7 days/);

  const guessed = buildCoachContext("2026-11-10", profile, [
    { entry_date: "2026-11-10", name: "Soup", meal: "lunch", calories: 300, protein_g: 10, carbs_g: 40, fat_g: 8, is_guessed: true },
  ], [], []);
  assert.equal(guessed.dataQuality.guessedFoodEntriesToday, 1);
  assert.match(guessed.evidence[0].value, /1 marked guessed/);
  assert.equal(guessed.today.food[0].isGuessed, true);
});

test("conflicting entries stay visible instead of being silently reconciled", () => {
  const context = buildCoachContext("2026-11-10", profile, [
    { entry_date: "2026-11-10", name: "Lunch", meal: "lunch", calories: 400, protein_g: 15, carbs_g: 50, fat_g: 10, is_guessed: false },
    { entry_date: "2026-11-10", name: "Lunch", meal: "lunch", calories: 700, protein_g: 20, carbs_g: 70, fat_g: 25, is_guessed: false },
  ], [], []);
  assert.equal(context.today.food.length, 2);
  assert.equal(context.recentTrends.sevenDays[0].calories, 1100);
});

test("Coach safety and grounding rules are explicit and use the selected limit", () => {
  assert.match(COACH_SYSTEM_INSTRUCTION, /cite the relevant date or date range/);
  assert.match(COACH_SYSTEM_INSTRUCTION, /there is not enough data/);
  assert.match(COACH_SYSTEM_INSTRUCTION, /Call out food values marked guessed/);
  assert.match(COACH_SYSTEM_INSTRUCTION, /If records conflict/);
  assert.match(COACH_SYSTEM_INSTRUCTION, /Never claim to change, save, or delete goals or logs/);
  assert.match(COACH_SYSTEM_INSTRUCTION, /Do not diagnose/);
  assert.equal(COACH_REQUESTS_PER_HOUR, 10);
});

test("database migration enforces the same request cap atomically", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20261110000800_fitlog_coach_rate_limit.sql", import.meta.url), "utf8");
  assert.match(migration, /request_count >= 10/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /requested_at <= request_time - interval '1 hour'/);
  assert.match(migration, /revoke all on table public\.fitlog_coach_request_events from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.consume_my_fitlog_coach_request\(\) to authenticated/);
});
