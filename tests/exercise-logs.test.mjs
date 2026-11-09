import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidExerciseLogDate, isValidExerciseRepetitions } from "../src/lib/exercise-logs.ts";

test("push-up repetitions accept whole counts within the database bounds", () => {
  assert.equal(isValidExerciseRepetitions(1), true);
  assert.equal(isValidExerciseRepetitions(10000), true);
  assert.equal(isValidExerciseRepetitions(0), false);
  assert.equal(isValidExerciseRepetitions(10001), false);
  assert.equal(isValidExerciseRepetitions(1.5), false);
  assert.equal(isValidExerciseRepetitions("10"), false);
});

test("exercise log dates must be real ISO calendar dates", () => {
  assert.equal(isValidExerciseLogDate("2024-02-29"), true);
  assert.equal(isValidExerciseLogDate("2025-02-29"), false);
  assert.equal(isValidExerciseLogDate("2026-13-01"), false);
  assert.equal(isValidExerciseLogDate("2026-1-01"), false);
});
