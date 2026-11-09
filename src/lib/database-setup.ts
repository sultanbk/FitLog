export type DatabaseSetupIssue = {
  table: string;
  column?: string;
  migrations: string[];
};

const profileColumnMigrations: Record<string, string[]> = {
  gemini_weekly_reflections_enabled: ["20261110000300_weekly_reflection_consent.sql"],
  gemini_meal_ideas_enabled: ["20261110000400_gemini_meal_ideas_consent.sql"],
};

const migrationByTable: Record<string, string[]> = {
  exercise_logs: ["20261110000100_create_exercise_logs.sql"],
  food_entries: ["20261109000300_food_entries_and_protein_settings.sql"],
  food_memory: ["20261109000500_user_food_memory.sql", "20261109000800_food_memory_servings.sql"],
  quick_adds: ["20261109000600_quick_adds.sql", "20261110000200_edit_quick_adds.sql"],
  weigh_ins: ["20261109000200_create_weigh_ins.sql"],
};

export function getDatabaseSetupIssue(error: { code?: string | null; message?: string | null; details?: string | null }): DatabaseSetupIssue | null {
  if (error.code === "42703" || error.code === "PGRST204") {
    const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
    const column = Object.keys(profileColumnMigrations).find((name) => message.includes(name));
    if (column) {
      return { table: "profiles", column, migrations: profileColumnMigrations[column] };
    }
    return null;
  }
  if (error.code !== "PGRST205" && error.code !== "42P01") return null;
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
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
