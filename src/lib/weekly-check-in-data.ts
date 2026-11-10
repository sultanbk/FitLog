import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/progress-analytics";
import { calculateWeeklyCheckIn, getMonday, type WeeklyCheckIn } from "@/lib/weekly-check-in";

const HISTORY_CHUNK_WEEKS = 8;
const PAGE_SIZE = 1000;

export class WeeklyCheckInLoadError extends Error {
  constructor(readonly databaseError: { code?: string | null; message?: string | null; details?: string | null }) {
    super(`Could not load check-in history: ${databaseError.message ?? "Unknown database error"}`);
    this.name = "WeeklyCheckInLoadError";
  }
}

export async function loadWeeklyCheckIn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  today: string,
): Promise<WeeklyCheckIn> {
  const currentWeekStart = getMonday(today);
  for (let lookbackWeeks = HISTORY_CHUNK_WEEKS; ; lookbackWeeks += HISTORY_CHUNK_WEEKS) {
    const coverageStart = addDays(currentWeekStart, -lookbackWeeks * 7);
    const [foodDays, exerciseDays] = await Promise.all([
      loadEntryDates(supabase, "food_entries", userId, coverageStart, today),
      loadEntryDates(supabase, "exercise_logs", userId, coverageStart, today),
    ]);
    const result = calculateWeeklyCheckIn(today, [...foodDays, ...exerciseDays], coverageStart);
    if (!result.streakIsAtLeast) return result;
  }
}

async function loadEntryDates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "food_entries" | "exercise_logs",
  userId: string,
  start: string,
  end: string,
) {
  const dates: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.from(table)
      .select("entry_date")
      .eq("user_id", userId)
      .gte("entry_date", start)
      .lte("entry_date", end)
      .order("entry_date", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new WeeklyCheckInLoadError(error);
    dates.push(...(data ?? []).map((row) => row.entry_date));
    if (!data || data.length < PAGE_SIZE) return dates;
  }
}
