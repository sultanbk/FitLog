export type AnalyticsPeriod = "week" | "month" | "year";

export type NutritionRecord = {
  entry_date: string;
  calories: number;
  protein_g: number;
};

export type ExerciseRecord = {
  entry_date: string;
  repetitions: number;
};

export type WeightRecord = {
  date: string;
  weight_kg: number;
  created_at: string;
};

export type AnalyticsBucket = {
  key: string;
  label: string;
  calories: number;
  protein: number;
  foodDays: number;
  pushUps: number;
  exerciseDays: number;
  averageWeight: number | null;
  weighInCount: number;
};

export function isValidDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isValidMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const [year, month] = value.split("-").map(Number);
  return year >= 1900 && month >= 1 && month <= 12;
}

export function addDays(day: string, count: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function monthKey(day: string) {
  return day.slice(0, 7);
}

export function dayInAppTimezone(timestamp: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

export function calendarDays(month: string): (string | null)[] {
  if (!isValidMonth(month)) return [];
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const days: (string | null)[] = Array.from({ length: mondayOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getPeriodStart(period: AnalyticsPeriod, today: string) {
  if (period === "week") return addDays(today, -6);
  if (period === "month") return addDays(today, -29);
  const [year, month] = today.split("-").map(Number);
  return `${shiftMonth(`${year}-${String(month).padStart(2, "0")}`, -11)}-01`;
}

export function buildAnalyticsBuckets(
  period: AnalyticsPeriod,
  today: string,
  nutrition: NutritionRecord[],
  exercises: ExerciseRecord[],
  weighIns: WeightRecord[],
): AnalyticsBucket[] {
  const keys: string[] = [];
  if (period === "year") {
    const firstMonth = monthKey(getPeriodStart(period, today));
    for (let index = 0; index < 12; index++) keys.push(shiftMonth(firstMonth, index));
  } else {
    const count = period === "week" ? 7 : 30;
    const start = getPeriodStart(period, today);
    for (let index = 0; index < count; index++) keys.push(addDays(start, index));
  }

  const buckets = keys.map((key): AnalyticsBucket => ({
    key,
    label: formatBucketLabel(period, key),
    calories: 0,
    protein: 0,
    foodDays: 0,
    pushUps: 0,
    exerciseDays: 0,
    averageWeight: null,
    weighInCount: 0,
  }));
  const positions = new Map(keys.map((key, index) => [key, index]));
  const nutritionDays = buckets.map(() => new Set<string>());
  const exerciseDays = buckets.map(() => new Set<string>());
  const weights = buckets.map(() => [] as number[]);

  for (const record of nutrition) {
    const key = period === "year" ? monthKey(record.entry_date) : record.entry_date;
    const index = positions.get(key);
    if (index === undefined) continue;
    buckets[index].calories += Number(record.calories);
    buckets[index].protein += Number(record.protein_g);
    nutritionDays[index].add(record.entry_date);
  }
  for (const record of exercises) {
    const key = period === "year" ? monthKey(record.entry_date) : record.entry_date;
    const index = positions.get(key);
    if (index === undefined) continue;
    buckets[index].pushUps += Number(record.repetitions);
    exerciseDays[index].add(record.entry_date);
  }
  for (const record of weighIns) {
    const key = period === "year" ? monthKey(record.date) : record.date;
    const index = positions.get(key);
    if (index === undefined) continue;
    weights[index].push(Number(record.weight_kg));
  }

  return buckets.map((bucket, index) => ({
    ...bucket,
    foodDays: nutritionDays[index].size,
    exerciseDays: exerciseDays[index].size,
    weighInCount: weights[index].length,
    averageWeight: weights[index].length
      ? weights[index].reduce((sum, weight) => sum + weight, 0) / weights[index].length
      : null,
  }));
}

export function formatBucketLabel(period: AnalyticsPeriod, key: string) {
  const date = new Date(`${key.length === 7 ? `${key}-01` : key}T12:00:00Z`);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (period === "year") return months[date.getUTCMonth()];
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${weekdays[date.getUTCDay()]} ${date.getUTCDate()}`;
}
