export type ReflectionFoodRecord = { entry_date: string; calories: number; protein_g: number };
export type ReflectionExerciseRecord = { entry_date: string; repetitions: number };
type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
type WeekdayCounts = Record<Weekday, number>;

export type WeeklyReflectionSummary = {
  foodDaysLogged: number;
  exerciseDaysLogged: number;
  totalPushUps: number;
  averageCaloriesOnFoodDays: number | null;
  averageProteinOnFoodDays: number | null;
  foodLoggingByWeekday: WeekdayCounts;
  exerciseLoggingByWeekday: WeekdayCounts;
};

export function buildWeeklyReflectionSummary(
  today: string,
  food: ReflectionFoodRecord[],
  exercise: ReflectionExerciseRecord[],
): WeeklyReflectionSummary | null {
  if (!isReflectionDay(today)) return null;

  const start = reflectionDayOffset(today, -6);
  const dailyFood = new Map<string, { calories: number; protein: number }>();
  const dailyExercise = new Map<string, number>();

  for (const record of food) {
    if (!isReflectionDay(record.entry_date) || record.entry_date < start || record.entry_date > today) continue;
    const daily = dailyFood.get(record.entry_date) ?? { calories: 0, protein: 0 };
    daily.calories += Number(record.calories);
    daily.protein += Number(record.protein_g);
    dailyFood.set(record.entry_date, daily);
  }
  for (const record of exercise) {
    if (!isReflectionDay(record.entry_date) || record.entry_date < start || record.entry_date > today) continue;
    dailyExercise.set(record.entry_date, (dailyExercise.get(record.entry_date) ?? 0) + Number(record.repetitions));
  }

  const loggedDays = new Set([...dailyFood.keys(), ...dailyExercise.keys()]);
  if (loggedDays.size < 4) return null;

  const weekdays: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const foodLoggingByWeekday = Object.fromEntries(weekdays.map((day) => [day, 0])) as WeekdayCounts;
  const exerciseLoggingByWeekday = Object.fromEntries(weekdays.map((day) => [day, 0])) as WeekdayCounts;
  for (const day of dailyFood.keys()) {
    foodLoggingByWeekday[weekdays[new Date(`${day}T12:00:00Z`).getUTCDay()]] += 1;
  }
  for (const day of dailyExercise.keys()) {
    exerciseLoggingByWeekday[weekdays[new Date(`${day}T12:00:00Z`).getUTCDay()]] += 1;
  }

  const foodDays = [...dailyFood.values()];
  return {
    foodDaysLogged: dailyFood.size,
    exerciseDaysLogged: dailyExercise.size,
    totalPushUps: [...dailyExercise.values()].reduce((sum, repetitions) => sum + repetitions, 0),
    averageCaloriesOnFoodDays: foodDays.length
      ? Math.round(foodDays.reduce((sum, day) => sum + day.calories, 0) / foodDays.length)
      : null,
    averageProteinOnFoodDays: foodDays.length
      ? Math.round(foodDays.reduce((sum, day) => sum + day.protein, 0) / foodDays.length)
      : null,
    foodLoggingByWeekday,
    exerciseLoggingByWeekday,
  };
}

export type WeeklyReflection = {
  recap: string;
  pattern: string;
  tryNextWeek: string;
};

export function isWeeklyReflection(value: unknown): value is WeeklyReflection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const reflection = value as Record<string, unknown>;
  const keys = ["recap", "pattern", "tryNextWeek"];
  return Object.keys(reflection).length === keys.length &&
    keys.every((key) => Object.hasOwn(reflection, key) &&
      typeof reflection[key] === "string" &&
      reflection[key].trim().length >= 5 &&
      reflection[key].length <= 220);
}

function isReflectionDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function reflectionDayOffset(day: string, offset: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
