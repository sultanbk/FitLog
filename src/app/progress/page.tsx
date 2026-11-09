import Link from "next/link";
import { redirect } from "next/navigation";
import { ActivityCalendar } from "@/components/activity-calendar";
import { AppShell } from "@/components/app-shell";
import { ProgressChart } from "@/components/progress-chart";
import { createClient } from "@/lib/supabase/server";
import {
  buildAnalyticsBuckets,
  calendarDays,
  dayInAppTimezone,
  getPeriodStart,
  isValidMonth,
  monthKey,
  type AnalyticsPeriod,
  type ExerciseRecord,
  type NutritionRecord,
  type WeightRecord,
} from "@/lib/progress-analytics";
import {
  getDemoExerciseLogs,
  getDemoFoodEntries,
  getDemoState,
  getDemoWeighIns,
  type DemoWeighIn,
  type ExerciseLog,
  type FoodEntry,
} from "@/lib/demo-session";

type WeightRow = DemoWeighIn;
type AnalyticsData = { nutrition: NutritionRecord[]; exercises: ExerciseRecord[]; weights: WeightRecord[] };
type SearchParams = {
  period?: string;
  month?: string;
  weightError?: string;
  weightSaved?: string;
};

const periods: { id: AnalyticsPeriod; label: string; detail: string }[] = [
  { id: "week", label: "Week", detail: "Last 7 days" },
  { id: "month", label: "Month", detail: "Last 30 days" },
  { id: "year", label: "Year", detail: "Last 12 months" },
];

export default async function ProgressPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const period: AnalyticsPeriod = periods.some((option) => option.id === params.period)
    ? params.period as AnalyticsPeriod
    : "week";
  const currentMonth = monthKey(today);
  const requestedMonth = params.month && isValidMonth(params.month) ? params.month : currentMonth;
  const calendarMonth = requestedMonth > currentMonth ? currentMonth : requestedMonth;
  const periodStart = getPeriodStart(period, today);
  const calendarStart = `${calendarMonth}-01`;
  const monthDays = calendarDays(calendarMonth).filter((day): day is string => day !== null);
  const calendarEnd = monthDays.at(-1)! > today ? today : monthDays.at(-1)!;
  const calendarInsidePeriod = calendarStart >= periodStart && calendarEnd <= today;
  const localDemo = process.env.FITLOG_ENABLE_DEMO === "true";

  let nutrition: NutritionRecord[] = [];
  let exercises: ExerciseRecord[] = [];
  let weights: WeightRecord[] = [];
  let calendarNutrition: NutritionRecord[] = [];
  let calendarExercises: ExerciseRecord[] = [];
  let calendarWeights: WeightRecord[] = [];
  let suggestedWeight = 0;
  let weightAction = "/api/weigh-ins";

  if (localDemo) {
    const demo = await getDemoState();
    if (!demo.active) redirect("/login");
    if (!demo.profile) redirect("/onboarding");
    weightAction = "/api/demo/weigh-ins";
    suggestedWeight = demo.profile.current_weight_kg;
    const [foodEntries, exerciseLogs, weighIns] = await Promise.all([
      getDemoFoodEntries(),
      getDemoExerciseLogs(),
      getDemoWeighIns(),
    ]);
    const allData = fromDemoRecords(foodEntries, exerciseLogs, weighIns);
    nutrition = within(allData.nutrition, periodStart, today, (row) => row.entry_date);
    exercises = within(allData.exercises, periodStart, today, (row) => row.entry_date);
    weights = within(allData.weights, periodStart, today, (row) => row.date);
    if (calendarInsidePeriod) {
      calendarNutrition = nutrition;
      calendarExercises = exercises;
      calendarWeights = weights;
    } else {
      calendarNutrition = within(allData.nutrition, calendarStart, calendarEnd, (row) => row.entry_date);
      calendarExercises = within(allData.exercises, calendarStart, calendarEnd, (row) => row.entry_date);
      calendarWeights = within(allData.weights, calendarStart, calendarEnd, (row) => row.date);
    }
    const newestWeighIn = [...allData.weights].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (newestWeighIn) suggestedWeight = newestWeighIn.weight_kg;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("current_weight_kg,age_years")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw new Error(`Could not load your profile: ${profileError.message}`);
    if (!profile?.age_years) redirect("/onboarding");
    suggestedWeight = Number(profile.current_weight_kg);

    const analyticsData = await loadAnalyticsData(supabase, user.id, periodStart, today);
    nutrition = analyticsData.nutrition;
    exercises = analyticsData.exercises;
    weights = analyticsData.weights;
    if (calendarInsidePeriod) {
      calendarNutrition = nutrition;
      calendarExercises = exercises;
      calendarWeights = weights;
    } else {
      const calendarData = await loadAnalyticsData(supabase, user.id, calendarStart, calendarEnd);
      calendarNutrition = calendarData.nutrition;
      calendarExercises = calendarData.exercises;
      calendarWeights = calendarData.weights;
    }
    const latestWeight = [...weights].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (latestWeight) suggestedWeight = latestWeight.weight_kg;
  }

  const buckets = buildAnalyticsBuckets(period, today, nutrition, exercises, weights);
  const loggedFoodDays = buckets.reduce((total, bucket) => total + bucket.foodDays, 0);
  const calorieTotal = buckets.reduce((total, bucket) => total + bucket.calories, 0);
  const proteinTotal = buckets.reduce((total, bucket) => total + bucket.protein, 0);
  const pushUpTotal = buckets.reduce((total, bucket) => total + bucket.pushUps, 0);
  const exerciseDays = buckets.reduce((total, bucket) => total + bucket.exerciseDays, 0);
  const orderedWeights = [...weights].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const weightChange = orderedWeights.length > 1
    ? orderedWeights.at(-1)!.weight_kg - orderedWeights[0].weight_kg
    : null;
  const nutritionCalendarDays = new Set(calendarNutrition.map((row) => row.entry_date));
  const exerciseCalendarDays = new Set(calendarExercises.map((row) => row.entry_date));
  const weightCalendarDays = new Set(calendarWeights.map((row) => row.date));

  return (
    <AppShell active="progress">
      <header className="mb-7">
        <p className="fit-eyebrow">Patterns, not pressure</p>
        <h1 className="fit-heading">Your progress</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#7b8077]">Explore your nutrition, movement, and weigh-ins over time. Each view reflects only the days you’ve logged.</p>
      </header>

      <section className="fit-card" aria-labelledby="analytics-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="fit-eyebrow">A wider view</p>
            <h2 id="analytics-title" className="mt-2 text-2xl">Your patterns</h2>
            <p className="mt-1 text-sm text-[#7b8077]">{periods.find((option) => option.id === period)?.detail} · averages use logged days only</p>
          </div>
          <nav aria-label="Analytics time range" className="flex rounded-lg border border-[#e6e3da] bg-[#f6f4ef] p-1">
            {periods.map((option) => (
              <Link key={option.id} href={`/progress?period=${option.id}&month=${calendarMonth}`} aria-current={period === option.id ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${period === option.id ? "bg-[#fffefa] text-[#35483a] shadow-sm" : "text-[#7b8077] hover:text-[#35483a]"}`}>{option.label}</Link>
            ))}
          </nav>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Summary label="Days with food logs" value={String(loggedFoodDays)} detail={`in this ${period}`} />
          <Summary label="Avg. calories" value={loggedFoodDays ? `${Math.round(calorieTotal / loggedFoodDays).toLocaleString()} kcal` : "—"} detail="per day with food logs" />
          <Summary label="Push-ups" value={pushUpTotal.toLocaleString()} detail={`${exerciseDays} active ${exerciseDays === 1 ? "day" : "days"}`} />
          <Summary label="Recorded weight change" value={weightChange === null ? "—" : `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg`} detail={weightChange === null ? "log 2 weigh-ins to compare" : `${orderedWeights.length} weigh-ins · first to latest`} />
        </div>

        {loggedFoodDays > 0 && <p className="mt-4 text-sm text-[#62685f]">Protein averaged <strong className="font-semibold text-[#35483a]">{Math.round(proteinTotal / loggedFoodDays)} g</strong> on days with food entries.</p>}
        {orderedWeights.length > 1 && <p className="mt-2 text-xs leading-5 text-[#7b8077]">Recorded weight change compares your first and latest entries in this range. It’s a measurement, not a judgment.</p>}
      </section>

      <section aria-label={`${period} charts`} className="mt-5 grid gap-4 lg:grid-cols-2">
        <ProgressChart title="Calories" description="Daily total, or monthly total in the yearly view." buckets={buckets} metric="calories" unit="kcal" color="#71856a" />
        <ProgressChart title="Protein" description="Daily total, or monthly total in the yearly view." buckets={buckets} metric="protein" unit="g" color="#b68757" />
        <ProgressChart title="Body weight" description="Average of weigh-ins recorded in each interval." buckets={buckets} metric="averageWeight" unit="kg" color="#a57956" chartType="line" />
        <ProgressChart title="Push-ups" description="Repetitions logged in each day or month." buckets={buckets} metric="pushUps" unit="reps" color="#7488a0" />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <ActivityCalendar
          month={calendarMonth}
          today={today}
          period={period}
          nutritionDays={nutritionCalendarDays}
          weightDays={weightCalendarDays}
          exerciseDays={exerciseCalendarDays}
        />
        <section className="fit-card" aria-labelledby="weight-log-title">
          <p className="fit-eyebrow">A simple check-in</p>
          <h2 id="weight-log-title" className="mt-2 text-2xl">Log your weight</h2>
          <p className="mt-1 text-sm leading-6 text-[#7b8077]">Enter a reading when it feels useful. Day-to-day changes are normal.</p>
          {params.weightSaved && <p role="status" className="mt-4 rounded-lg bg-[#edf5e9] p-3 text-sm text-[#315c35]">Weight saved.</p>}
          {params.weightError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{params.weightError.replaceAll("+", " ")}</p>}
          <form action={weightAction} method="post" className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end lg:grid-cols-1">
            <label className="block text-sm font-medium text-[#454c42]">Weight
              <span className="relative mt-1.5 block">
                <input className="fit-input pr-14" name="weight_kg" type="number" required min="25" max="350" step="0.1" defaultValue={suggestedWeight} />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#81877e]">kg</span>
              </span>
            </label>
            <button className="fit-button-primary w-full sm:w-auto lg:w-full">Save weigh-in</button>
          </form>
        </section>
      </div>
      <p className="mt-5 text-center text-xs leading-5 text-[#7b8077]">Nutrition and weight trends are estimates and records, not medical advice.</p>
    </AppShell>
  );
}

function Summary({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="min-w-0 rounded-lg border border-[#e6e3da] bg-[#fffefa] p-4">
    <p className="text-xs leading-5 text-[#7b8077]">{label}</p>
    <p className="mt-2 truncate text-xl font-semibold tabular-nums text-[#252922]">{value}</p>
    <p className="mt-1 text-xs leading-5 text-[#7b8077]">{detail}</p>
  </div>;
}

function fromDemoRecords(food: FoodEntry[], exercise: ExerciseLog[], weighIns: WeightRow[]): AnalyticsData {
  return {
    nutrition: food.map((row) => ({ entry_date: row.entry_date, calories: Number(row.calories), protein_g: Number(row.protein_g) })),
    exercises: exercise.map((row) => ({ entry_date: row.entry_date, repetitions: Number(row.repetitions) })),
    weights: weighIns.map((row) => ({ date: dayInAppTimezone(row.created_at), weight_kg: Number(row.weight_kg), created_at: row.created_at })),
  };
}

function within<T>(rows: T[], start: string, end: string, getDate: (row: T) => string) {
  return rows.filter((row) => getDate(row) >= start && getDate(row) <= end);
}

async function loadAnalyticsData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  startDay: string,
  endDay: string,
): Promise<AnalyticsData> {
  const startTimestamp = new Date(`${startDay}T00:00:00+05:30`).toISOString();
  const endTimestamp = new Date(`${nextDay(endDay)}T00:00:00+05:30`).toISOString();
  const [nutrition, exercises, weights] = await Promise.all([
    fetchNutrition(supabase, userId, startDay, endDay),
    fetchExercises(supabase, userId, startDay, endDay),
    fetchWeights(supabase, userId, startTimestamp, endTimestamp),
  ]);
  return {
    nutrition,
    exercises,
    weights: weights.map((row) => ({ date: dayInAppTimezone(row.created_at), weight_kg: Number(row.weight_kg), created_at: row.created_at })),
  };
}

async function fetchNutrition(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, start: string, end: string) {
  const rows: NutritionRecord[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("food_entries")
      .select("entry_date,calories,protein_g")
      .eq("user_id", userId)
      .gte("entry_date", start)
      .lte("entry_date", end)
      .order("entry_date")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error(`Could not load nutrition history: ${error.message}`);
    rows.push(...(data ?? []).map((row) => ({ entry_date: row.entry_date, calories: Number(row.calories), protein_g: Number(row.protein_g) })));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function fetchExercises(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, start: string, end: string) {
  const rows: ExerciseRecord[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("exercise_logs")
      .select("entry_date,repetitions")
      .eq("user_id", userId)
      .gte("entry_date", start)
      .lte("entry_date", end)
      .order("entry_date")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error(`Could not load exercise history: ${error.message}`);
    rows.push(...(data ?? []).map((row) => ({ entry_date: row.entry_date, repetitions: Number(row.repetitions) })));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function fetchWeights(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, start: string, end: string) {
  const rows: { weight_kg: number; created_at: string }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("weigh_ins")
      .select("id,weight_kg,created_at")
      .eq("user_id", userId)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error(`Could not load weigh-in history: ${error.message}`);
    rows.push(...(data ?? []).map((row) => ({ weight_kg: Number(row.weight_kg), created_at: row.created_at })));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

function nextDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
