import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateWeeklyCheckIn, getMonday, WEEKLY_CHECK_IN_TARGET } from "../src/lib/weekly-check-in.ts";

test("weeks begin Monday and end Sunday", () => {
  assert.equal(getMonday("2026-11-10"), "2026-11-09");
  assert.equal(getMonday("2026-11-08"), "2026-11-02");
});

test("counts unique logged days this week and completed qualifying weeks separately", () => {
  const progress = calculateWeeklyCheckIn("2026-11-10", [
    "2026-11-09", "2026-11-09", "2026-11-10",
    "2026-11-02", "2026-11-04", "2026-11-08",
  ], "2026-10-12");
  assert.equal(progress.daysThisWeek, 2);
  assert.equal(progress.completedWeekStreak, 1);
  assert.equal(progress.streakIsAtLeast, false);
  assert.equal(WEEKLY_CHECK_IN_TARGET, 3);
});

test("a missed completed week ends the streak without changing current-week progress", () => {
  const progress = calculateWeeklyCheckIn("2026-11-10", [
    "2026-11-09", "2026-11-10",
    "2026-11-02", "2026-11-03",
    "2026-10-26", "2026-10-28", "2026-10-31",
  ], "2026-10-12");
  assert.equal(progress.daysThisWeek, 2);
  assert.equal(progress.completedWeekStreak, 0);
});

test("reaching this week's goal does not count it as completed before Sunday", () => {
  const progress = calculateWeeklyCheckIn("2026-11-12", [
    "2026-11-09", "2026-11-10", "2026-11-11",
    "2026-11-02", "2026-11-03",
  ], "2026-10-12");
  assert.equal(progress.daysThisWeek, 3);
  assert.equal(progress.completedWeekStreak, 0);
});

test("an older qualifying week beyond known history is represented as a lower bound", () => {
  const progress = calculateWeeklyCheckIn("2026-11-10", [
    "2026-11-09", "2026-11-10",
    "2026-11-02", "2026-11-04", "2026-11-08",
  ], "2026-11-02");
  assert.equal(progress.completedWeekStreak, 1);
  assert.equal(progress.streakIsAtLeast, true);
});

test("future or malformed dates do not count", () => {
  const progress = calculateWeeklyCheckIn("2026-11-10", [
    "2026-11-09", "2026-11-11", "2026-02-30",
  ], "2026-11-02");
  assert.equal(progress.daysThisWeek, 1);
  assert.equal(progress.completedWeekStreak, 0);
});
