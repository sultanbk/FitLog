import assert from "node:assert/strict";
import { test } from "node:test";
import { getDatabaseSetupIssue } from "../src/lib/database-setup.ts";

test("missing exercise table errors point to the exercise migration", () => {
  assert.deepEqual(getDatabaseSetupIssue({
    code: "PGRST205",
    message: "Could not find the table 'public.exercise_logs' in the schema cache",
  }), {
    table: "exercise_logs",
    migrations: ["20261110000100_create_exercise_logs.sql"],
  });
});

test("missing food memory setup lists its migrations in order", () => {
  assert.deepEqual(getDatabaseSetupIssue({
    code: "42P01",
    message: 'relation "public.food_memory" does not exist',
  }), {
    table: "food_memory",
    migrations: ["20261109000500_user_food_memory.sql", "20261109000800_food_memory_servings.sql"],
  });
});

test("missing weekly reflection consent points to its migration", () => {
  assert.deepEqual(getDatabaseSetupIssue({
    code: "42703",
    message: 'column profiles.gemini_weekly_reflections_enabled does not exist',
  }), {
    table: "profiles",
    column: "gemini_weekly_reflections_enabled",
    migrations: ["20261110000300_weekly_reflection_consent.sql"],
  });
});

test("missing meal ideas consent points to its migration", () => {
  assert.deepEqual(getDatabaseSetupIssue({
    code: "42703",
    message: 'column profiles.gemini_meal_ideas_enabled does not exist',
  }), {
    table: "profiles",
    column: "gemini_meal_ideas_enabled",
    migrations: ["20261110000400_gemini_meal_ideas_consent.sql"],
  });
});

test("unrelated database errors are not mistaken for missing table setup", () => {
  assert.equal(getDatabaseSetupIssue({ code: "42501", message: "permission denied" }), null);
  assert.equal(getDatabaseSetupIssue({ code: "PGRST205", message: "Could not find the column in the schema cache" }), null);
  assert.equal(getDatabaseSetupIssue({ code: "PGRST205", message: "Could not find the table 'public.shares' in the schema cache" }), null);
});
