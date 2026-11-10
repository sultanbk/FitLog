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

test("legacy Gemini feature toggle columns are no longer required", () => {
  assert.equal(getDatabaseSetupIssue({
    code: "42703",
    message: 'column profiles.gemini_weekly_reflections_enabled does not exist',
  }), null);
  assert.equal(getDatabaseSetupIssue({
    code: "42703",
    message: 'column profiles.gemini_meal_ideas_enabled does not exist',
  }), null);
});

test("missing FitLog Coach consent column points to its migration", () => {
  assert.deepEqual(getDatabaseSetupIssue({
    code: "42703",
    message: "column profiles.gemini_coach_enabled does not exist",
  }), {
    table: "profiles",
    column: "gemini_coach_enabled",
    migrations: ["20261110000700_gemini_coach_opt_in.sql"],
  });
});

test("missing Coach rate-limit RPC points to its migration", () => {
  assert.deepEqual(getDatabaseSetupIssue({
    code: "PGRST202",
    message: "Could not find the function public.consume_my_fitlog_coach_request in the schema cache",
  }), {
    table: "fitlog_coach_request_events",
    migrations: ["20261110000800_fitlog_coach_rate_limit.sql"],
  });
});

test("missing personal Gemini key RPC points to its migration", () => {
  assert.deepEqual(getDatabaseSetupIssue({
    code: "PGRST202",
    message: "Could not find the function public.has_my_gemini_key in the schema cache",
  }), {
    table: "user_gemini_keys",
    migrations: ["20261110000600_user_gemini_keys.sql"],
  });
  assert.deepEqual(getDatabaseSetupIssue({
    message: "Could not find the function public.has_my_gemini_key in the schema cache",
  }), {
    table: "user_gemini_keys",
    migrations: ["20261110000600_user_gemini_keys.sql"],
  });
});

test("unrelated database errors are not mistaken for missing table setup", () => {
  assert.equal(getDatabaseSetupIssue({ code: "42501", message: "permission denied" }), null);
  assert.equal(getDatabaseSetupIssue({ code: "PGRST205", message: "Could not find the column in the schema cache" }), null);
  assert.equal(getDatabaseSetupIssue({ code: "PGRST205", message: "Could not find the table 'public.shares' in the schema cache" }), null);
  assert.equal(getDatabaseSetupIssue({ code: "PGRST202", message: "Could not find the function public.some_other_function" }), null);
});
