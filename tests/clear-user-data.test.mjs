import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20261110000500_clear_my_fitlog_data.sql", import.meta.url), "utf8");
const personalKeysMigration = await readFile(new URL("../supabase/migrations/20261110000600_user_gemini_keys.sql", import.meta.url), "utf8");
const profileRoute = await readFile(new URL("../src/app/api/profile/clear-data/route.ts", import.meta.url), "utf8");
const demoRoute = await readFile(new URL("../src/app/api/demo/clear-data/route.ts", import.meta.url), "utf8");

test("clear-data RPC deletes only the authenticated user's FitLog records and retains the auth account", () => {
  assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
  assert.match(migration, /current_user_id uuid := auth\.uid\(\)/i);
  for (const table of ["weigh_ins", "exercise_logs", "food_entries", "food_memory", "quick_adds"]) {
    assert.match(migration, new RegExp(`delete from public\\.${table} where user_id = current_user_id`, "i"));
  }
  assert.match(migration, /delete from public\.profiles where id = current_user_id/i);
  assert.doesNotMatch(migration, /delete from auth\.users/i);
  assert.match(migration, /grant execute on function public\.clear_my_fitlog_data\(\) to authenticated/i);
  assert.match(personalKeysMigration, /delete from public\.user_gemini_keys where user_id = current_user_id/i);
});

test("signed-in clear-data route requires an exact confirmation before invoking the RPC", () => {
  assert.match(profileRoute, /form\.get\("confirmation"\) !== "CLEAR"/);
  assert.match(profileRoute, /supabase\.rpc\("clear_my_fitlog_data"\)/);
  assert.match(profileRoute, /if \(error\) return redirectTo/);
});

test("demo clear-data route removes every stored data cookie but keeps the demo session", () => {
  for (const cookie of [
    "DEMO_PROFILE_COOKIE",
    "DEMO_WEIGH_INS_COOKIE",
    "DEMO_EXERCISE_LOGS_COOKIE",
    "DEMO_FOOD_ENTRIES_COOKIE",
    "DEMO_FOOD_MEMORY_COOKIE",
    "DEMO_QUICK_ADDS_COOKIE",
  ]) {
    assert.match(demoRoute, new RegExp(`response\\.cookies\\.delete\\(${cookie}\\)`));
  }
  assert.doesNotMatch(demoRoute, /cookies\.delete\(DEMO_SESSION_COOKIE\)/);
});

test("personal Gemini key table is private and can only be accessed through own-user RPCs", () => {
  assert.match(personalKeysMigration, /alter table public\.user_gemini_keys enable row level security/i);
  assert.match(personalKeysMigration, /revoke all on table public\.user_gemini_keys from public, anon, authenticated/i);
  assert.match(personalKeysMigration, /where user_id = auth\.uid\(\)/i);
  assert.match(personalKeysMigration, /grant execute on function public\.set_my_gemini_key\(text\) to authenticated/i);
  assert.match(personalKeysMigration, /grant execute on function public\.get_my_gemini_key\(\) to authenticated/i);
  assert.match(personalKeysMigration, /grant execute on function public\.has_my_gemini_key\(\) to authenticated/i);
  assert.match(personalKeysMigration, /grant execute on function public\.delete_my_gemini_key\(\) to authenticated/i);
});
