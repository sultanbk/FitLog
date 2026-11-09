import { cookies } from "next/headers";
import type { ActivityLevel, SexForFormula } from "@/lib/calorie-target";
import { isValidExerciseLogDate, isValidExerciseRepetitions } from "@/lib/exercise-logs";

export const DEMO_SESSION_COOKIE = "fitlog_demo_session";
export const DEMO_PROFILE_COOKIE = "fitlog_demo_profile";
export const DEMO_WEIGH_INS_COOKIE = "fitlog_demo_weigh_ins";
export const DEMO_EXERCISE_LOGS_COOKIE = "fitlog_demo_exercise_logs";
export const DEMO_FOOD_ENTRIES_COOKIE = "fitlog_demo_food_entries";
export const DEMO_FOOD_MEMORY_COOKIE = "fitlog_demo_food_memory";
export const DEMO_QUICK_ADDS_COOKIE = "fitlog_demo_quick_adds";
export const DEMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export type DemoProfile = {
  age_years: number;
  sex: SexForFormula;
  activity_level: ActivityLevel;
  height_cm: number;
  current_weight_kg: number;
  goal_weight_kg: number;
  goal_duration_days: number;
  protein_g_per_kg?: number;
  daily_calorie_target?: number;
  maintenance_calories?: number;
  food_memory_enabled?: boolean;
};

export type DemoWeighIn = { id: string; weight_kg: number; created_at: string };
export type ExerciseLog = { id: string; entry_date: string; exercise: "push-ups"; repetitions: number; created_at: string };
export type FoodEntry = { id: string; entry_date: string; name: string; meal: "breakfast" | "lunch" | "snack" | "dinner"; calories: number; protein_g: number; carbs_g: number; fat_g: number; is_guessed?: boolean; created_at: string };
export type FoodMemory = { id: string; name: string; serving_description: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; updated_at: string };
export type QuickAdd = { id: string; name: string; meal: "breakfast" | "lunch" | "snack" | "dinner"; calories: number; protein_g: number; carbs_g: number; fat_g: number; is_guessed: boolean; created_at: string };

export async function getDemoState(): Promise<{ active: boolean; profile: DemoProfile | null }> {
  if (process.env.FITLOG_ENABLE_DEMO !== "true") return { active: false, profile: null };

  const cookieStore = await cookies();
  const active = cookieStore.get(DEMO_SESSION_COOKIE)?.value === "1";
  const encodedProfile = cookieStore.get(DEMO_PROFILE_COOKIE)?.value;
  if (!active || !encodedProfile) return { active, profile: null };

  try {
    const value = JSON.parse(Buffer.from(encodedProfile, "base64url").toString("utf8")) as Partial<DemoProfile>;
    const numericFields: (keyof DemoProfile)[] = [
      "age_years", "height_cm", "current_weight_kg", "goal_weight_kg", "goal_duration_days",
    ];
    if (!numericFields.every((field) => Number.isFinite(value[field])) ||
        (value.sex !== "female" && value.sex !== "male") ||
        !["sedentary", "light", "moderate", "active"].includes(value.activity_level ?? "")) {
      return { active, profile: null };
    }
    return { active, profile: { protein_g_per_kg: 1.5, food_memory_enabled: false, ...value } as DemoProfile };
  } catch {
    return { active, profile: null };
  }
}

export async function getDemoWeighIns(): Promise<DemoWeighIn[]> {
  if (process.env.FITLOG_ENABLE_DEMO !== "true") return [];
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_SESSION_COOKIE)?.value !== "1") return [];
  const encodedEntries = cookieStore.get(DEMO_WEIGH_INS_COOKIE)?.value;
  if (!encodedEntries) return [];

  try {
    const entries = JSON.parse(Buffer.from(encodedEntries, "base64url").toString("utf8")) as Partial<DemoWeighIn>[];
    return entries.filter((entry): entry is DemoWeighIn =>
      typeof entry.id === "string" &&
      typeof entry.created_at === "string" &&
      Number.isFinite(entry.weight_kg) &&
      entry.weight_kg! >= 25 && entry.weight_kg! <= 350,
    ).slice(0, 20);
  } catch {
    return [];
  }
}

export async function getDemoExerciseLogs(): Promise<ExerciseLog[]> {
  if (process.env.FITLOG_ENABLE_DEMO !== "true") return [];
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_SESSION_COOKIE)?.value !== "1") return [];
  const encoded = cookieStore.get(DEMO_EXERCISE_LOGS_COOKIE)?.value;
  if (!encoded) return [];
  try {
    const logs = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<ExerciseLog>[];
    return logs.filter((log): log is ExerciseLog =>
      typeof log.id === "string" &&
      typeof log.entry_date === "string" &&
      isValidExerciseLogDate(log.entry_date) &&
      log.exercise === "push-ups" &&
      isValidExerciseRepetitions(log.repetitions) &&
      typeof log.created_at === "string",
    ).slice(0, 20);
  } catch {
    return [];
  }
}

export async function getDemoFoodEntries(): Promise<FoodEntry[]> {
  if (process.env.FITLOG_ENABLE_DEMO !== "true") return [];
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_SESSION_COOKIE)?.value !== "1") return [];
  const encoded = cookieStore.get(DEMO_FOOD_ENTRIES_COOKIE)?.value;
  if (!encoded) return [];
  try {
    const entries = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as FoodEntry[];
    return entries.filter((entry) => typeof entry.id === "string" && typeof entry.entry_date === "string" && typeof entry.name === "string" && ["breakfast", "lunch", "snack", "dinner"].includes(entry.meal) && [entry.calories, entry.protein_g, entry.carbs_g, entry.fat_g].every(Number.isFinite)).slice(0, 20);
  } catch { return []; }
}

export async function getDemoFoodMemories(): Promise<FoodMemory[]> {
  if (process.env.FITLOG_ENABLE_DEMO !== "true") return [];
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_SESSION_COOKIE)?.value !== "1") return [];
  const encoded = cookieStore.get(DEMO_FOOD_MEMORY_COOKIE)?.value;
  if (!encoded) return [];
  try {
    const memories = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as FoodMemory[];
    return memories.filter((memory) => typeof memory.id === "string" && typeof memory.name === "string" && typeof memory.serving_description === "string" && [memory.calories, memory.protein_g, memory.carbs_g, memory.fat_g].every(Number.isFinite)).slice(0, 8);
  } catch { return []; }
}

export async function getDemoQuickAdds(): Promise<QuickAdd[]> {
  if (process.env.FITLOG_ENABLE_DEMO !== "true") return [];
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_SESSION_COOKIE)?.value !== "1") return [];
  const encoded = cookieStore.get(DEMO_QUICK_ADDS_COOKIE)?.value;
  if (!encoded) return [];
  try {
    const items = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as QuickAdd[];
    return items.filter((item) => typeof item.id === "string" && typeof item.name === "string" && ["breakfast", "lunch", "snack", "dinner"].includes(item.meal) && Number.isInteger(item.calories) && [item.protein_g, item.carbs_g, item.fat_g].every(Number.isFinite) && typeof item.is_guessed === "boolean").slice(0, 8);
  } catch { return []; }
}
