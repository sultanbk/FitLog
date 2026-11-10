export type DatabaseSetupIssue = {
  table: string;
  column?: string;
  migrations: string[];
};

const migrationByTable: Record<string, string[]> = {
  exercise_logs: ["20261110000100_create_exercise_logs.sql"],
  food_entries: ["20261109000300_food_entries_and_protein_settings.sql"],
  food_memory: ["20261109000500_user_food_memory.sql", "20261109000800_food_memory_servings.sql"],
  quick_adds: ["20261109000600_quick_adds.sql", "20261110000200_edit_quick_adds.sql"],
  user_gemini_keys: ["20261110000600_user_gemini_keys.sql"],
  fitlog_coach_request_events: ["20261110000800_fitlog_coach_rate_limit.sql"],
  weigh_ins: ["20261109000200_create_weigh_ins.sql"],
};

export function getDatabaseSetupIssue(error: { code?: string | null; message?: string | null; details?: string | null }): DatabaseSetupIssue | null {
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  if ((error.code === "PGRST202" || error.code === "42883" || !error.code) &&
      ["has_my_gemini_key", "get_my_gemini_key", "set_my_gemini_key", "delete_my_gemini_key"].some((name) => message.includes(name))) {
    return { table: "user_gemini_keys", migrations: migrationByTable.user_gemini_keys };
  }
  if ((error.code === "PGRST202" || error.code === "42883" || !error.code) &&
      message.includes("consume_my_fitlog_coach_request")) {
    return { table: "fitlog_coach_request_events", migrations: migrationByTable.fitlog_coach_request_events };
  }
  if ((error.code === "42703" || error.code === "PGRST204") &&
      message.includes("gemini_coach_enabled")) {
    return { table: "profiles", column: "gemini_coach_enabled", migrations: ["20261110000700_gemini_coach_opt_in.sql"] };
  }
  if (error.code === "42703" || error.code === "PGRST204") return null;
  if (error.code !== "PGRST205" && error.code !== "42P01") return null;
  const table = Object.keys(migrationByTable).find((name) =>
    message.includes(name) && (message.includes("table") || message.includes("relation")),
  );
  if (!table) return null;
  return { table, migrations: migrationByTable[table] };
}

export class DatabaseSetupError extends Error {
  readonly issue: DatabaseSetupIssue;

  constructor(issue: DatabaseSetupIssue) {
    super(`The public.${issue.table} table is missing from this Supabase project.`);
    this.name = "DatabaseSetupError";
    this.issue = issue;
  }
}
