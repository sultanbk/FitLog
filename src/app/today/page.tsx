import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { NaturalLanguageLogger } from "@/components/natural-language-logger";
import { createClient } from "@/lib/supabase/server";
import { getDemoExerciseLogs, getDemoFoodEntries, getDemoQuickAdds, getDemoState, type ExerciseLog, type FoodEntry, type QuickAdd } from "@/lib/demo-session";

const mealNames = ["breakfast", "lunch", "snack", "dinner"] as const;
const mealLabels: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };
export default async function TodayPage({ searchParams }: { searchParams: Promise<{ day?: string; saved?: string; error?: string; memoryWarning?: string; exerciseSaved?: string; exerciseError?: string }> }) {
  const params = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const day = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) && Date.parse(`${params.day}T00:00:00Z`) <= Date.parse(`${today}T00:00:00Z`) ? params.day : today;
  let profile: { daily_calorie_target: number; maintenance_calories: number | null; current_weight_kg: number; protein_g_per_kg: number } | null = null;
  let entries: FoodEntry[] = [];
  let quickAdds: QuickAdd[] = [];
  let exerciseLogs: ExerciseLog[] = [];
  if (process.env.FITLOG_ENABLE_DEMO === "true") {
    const demo = await getDemoState(); if (!demo.active) redirect("/login");
    if (demo.profile) profile = { daily_calorie_target: demo.profile.daily_calorie_target ?? 2000, maintenance_calories: demo.profile.maintenance_calories ?? null, current_weight_kg: demo.profile.current_weight_kg, protein_g_per_kg: demo.profile.protein_g_per_kg ?? 1.5 };
    entries = await getDemoFoodEntries();
    quickAdds = await getDemoQuickAdds();
    exerciseLogs = await getDemoExerciseLogs();
  } else {
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login");
    const { data } = await supabase.from("profiles").select("daily_calorie_target,maintenance_calories,current_weight_kg,protein_g_per_kg,age_years").eq("id", user.id).maybeSingle();
    if (data?.age_years != null) profile = { daily_calorie_target: data.daily_calorie_target, maintenance_calories: data.maintenance_calories, current_weight_kg: Number(data.current_weight_kg), protein_g_per_kg: Number(data.protein_g_per_kg ?? 1.5) };
    const { data: rows } = await supabase.from("food_entries").select("id,entry_date,name,meal,calories,protein_g,carbs_g,fat_g,is_guessed,created_at").eq("user_id", user.id).eq("entry_date", day).order("created_at", { ascending: false });
    entries = (rows ?? []) as FoodEntry[];
    const { data: logs } = await supabase.from("exercise_logs")
      .select("id,entry_date,exercise,repetitions,created_at")
      .eq("user_id", user.id)
      .eq("entry_date", day)
      .order("created_at", { ascending: false });
    exerciseLogs = (logs ?? []) as ExerciseLog[];
    const { data: savedFoods } = await supabase.from("quick_adds").select("id,name,meal,calories,protein_g,carbs_g,fat_g,is_guessed,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    quickAdds = (savedFoods ?? []) as QuickAdd[];
  }
  if (!profile) redirect("/onboarding");
  const todayEntries = entries.filter((entry) => entry.entry_date === day);
  const calories = todayEntries.reduce((sum, item) => sum + Number(item.calories), 0);
  const protein = todayEntries.reduce((sum, item) => sum + Number(item.protein_g), 0);
  const calorieTarget = Number(profile.daily_calorie_target) || 2000;
  const proteinTarget = Math.round(profile.current_weight_kg * profile.protein_g_per_kg);
  const previous = shiftDay(day, -1); const next = shiftDay(day, 1);
  const caloriesRemaining = Math.max(0, calorieTarget - calories);
  const caloriePercent = calorieTarget > 0 ? Math.round(calories / calorieTarget * 100) : 0;
  const proteinPercent = proteinTarget > 0 ? Math.round(protein / proteinTarget * 100) : 0;
  const todayExerciseLogs = exerciseLogs.filter((log) => log.entry_date === day);
  const pushUpTotal = todayExerciseLogs.reduce((sum, log) => sum + Number(log.repetitions), 0);
  const dateLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(`${day}T12:00:00+05:30`));
  return <AppShell active="today">

    <header className="mb-6 flex items-end justify-between gap-4">
      <div><p className="fit-eyebrow">A moment for yourself</p><h1 className="fit-heading">{day === today ? "Today, gently." : dateLabel}</h1><p className="mt-2 text-sm text-[#7b8077]">{dateLabel}</p></div>
      <div className="mb-1 flex shrink-0 items-center gap-2"><a aria-label="Previous day" href={`/today?day=${previous}`} className="grid size-10 place-items-center rounded-full border border-[#e6e3da] bg-[#fffefa] text-xl text-[#62685f] transition-colors hover:bg-[#eeeee5]">‹</a>{day < today ? <a aria-label="Next day" href={`/today?day=${next}`} className="grid size-10 place-items-center rounded-full border border-[#e6e3da] bg-[#fffefa] text-xl text-[#62685f] transition-colors hover:bg-[#eeeee5]">›</a> : <span className="grid size-10 place-items-center rounded-full text-xl text-[#c7ccc4]" aria-hidden="true">›</span>}</div>
    </header>
    {params.saved && <p role="status" className="mt-4 rounded-xl bg-[#edf5e9] p-3 text-sm text-[#335c2c]">Food entry saved.</p>}{params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error.replaceAll("+", " ")}</p>}
    {params.memoryWarning && <p role="alert" className="mt-2 rounded-xl bg-[#fff8e7] p-3 text-sm text-[#795b15]">Food was logged, but the remembered item wasn’t saved. Parse the food again to retry saving it to memory.</p>}
    {params.exerciseSaved && <p role="status" className="mt-3 rounded-xl bg-[#edf5e9] p-3 text-sm text-[#335c2c]">Push-up log updated.</p>}
    {params.exerciseError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.exerciseError.replaceAll("+", " ")}</p>}
    <section className="fit-card mt-6" aria-label="Daily nutrition progress">
      <div className="grid gap-7 md:grid-cols-[1.15fr_.85fr] md:items-center">
        <div>
          <p className="fit-eyebrow">Your daily rhythm</p>
          <div className="mt-3 flex items-baseline gap-2"><p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{calories.toLocaleString()}</p><span className="text-sm text-[#7b8077]">of {calorieTarget.toLocaleString()} kcal</span></div>
          <div className="fit-progress-track mt-4" role="progressbar" aria-label="Calories toward daily target" aria-valuemin={0} aria-valuemax={calorieTarget} aria-valuenow={Math.min(calories, calorieTarget)}><div className="fit-progress-fill" style={{ width: `${Math.min(100, caloriePercent)}%` }} /></div>
          <p className="mt-2 text-sm text-[#62685f]">{caloriesRemaining > 0 ? `${caloriesRemaining.toLocaleString()} kcal to your daily target` : "Daily target reached"}</p>
        </div>
        <div className="border-t border-[#efede7] pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0">
          <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-medium text-[#7b8077]">Protein</p><p className="mt-2 text-2xl font-semibold tabular-nums">{protein.toLocaleString()} <span className="text-sm font-medium text-[#7b8077]">/ {proteinTarget} g</span></p></div><span className="text-sm font-medium text-[#62685f]">{proteinPercent}%</span></div>
          <div className="fit-progress-track mt-4" role="progressbar" aria-label="Protein toward daily target" aria-valuemin={0} aria-valuemax={proteinTarget} aria-valuenow={Math.min(protein, proteinTarget)}><div className="fit-progress-fill" style={{ width: `${Math.min(100, proteinPercent)}%` }} /></div>
          <p className="mt-2 text-sm text-[#7b8077]">A steady source of energy and nourishment.</p>
        </div>
      </div>
    </section>

    <section className="fit-card mt-6"><div className="flex items-start justify-between gap-4"><div><p className="fit-eyebrow">Food journal</p><h2 className="mt-2 text-2xl">What have you enjoyed?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#7b8077]">Describe a meal for a nutrition estimate, then review and edit it before saving. AI estimates need to be enabled in Profile. Manual entry and quick adds are here whenever you prefer.</p></div></div><NaturalLanguageLogger day={day}/><details className="mt-5 border-t border-[#efede7] pt-4"><summary className="cursor-pointer text-sm font-semibold text-[#3e5944]">Enter nutrition manually</summary><form action="/api/food-entries" method="post" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><input type="hidden" name="entry_date" value={day} /><label className="col-span-2 text-xs font-medium text-[#62685f] sm:col-span-3">Food name<input required maxLength={100} name="name" placeholder="e.g. Oats with milk" className="fit-input mt-1.5" /></label><label className="text-xs font-medium text-[#62685f]">Meal<select name="meal" className="fit-input mt-1.5">{mealNames.map((meal) => <option key={meal} value={meal}>{mealLabels[meal]}</option>)}</select></label><FoodNumber label="Calories (kcal)" name="calories" integer /><FoodNumber label="Protein (g)" name="protein_g" /><FoodNumber label="Carbs (g)" name="carbs_g" /><FoodNumber label="Fat (g)" name="fat_g" /><button className="fit-button-primary col-span-2 mt-1 sm:col-span-4">Add food</button></form></details></section>
    <section className="fit-card mt-6" aria-labelledby="push-up-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="fit-eyebrow">Movement</p><h2 id="push-up-title" className="mt-2 text-2xl">Push-ups</h2><p className="mt-1 text-sm leading-6 text-[#7b8077]">Log a set whenever you like. Counts are private to your account.</p></div>
        <p className="text-right"><span className="block text-3xl font-semibold tabular-nums">{pushUpTotal.toLocaleString()}</span><span className="text-xs text-[#7b8077]">today</span></p>
      </div>
      <form action="/api/exercise-logs" method="post" className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <input type="hidden" name="entry_date" value={day} />
        <label className="block text-sm font-medium text-[#62685f]">Repetitions
          <input className="fit-input mt-1.5" name="repetitions" type="number" required min="1" max="10000" step="1" inputMode="numeric" placeholder="e.g. 10" />
        </label>
        <button className="fit-button-primary w-full sm:w-auto sm:min-w-36">Log push-ups</button>
      </form>
      {todayExerciseLogs.length > 0 ? (
        <ul className="mt-4 divide-y divide-[#efede7] border-t border-[#efede7]">
          {todayExerciseLogs.map((log) => (
            <li key={log.id} className="flex items-center justify-between gap-3 py-3">
              <span className="text-sm text-[#62685f]"><time dateTime={log.created_at}>{new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(log.created_at))}</time><span className="text-[#7b8077]"> · set</span></span>
              <div className="flex items-center gap-3"><span className="font-semibold tabular-nums">{Number(log.repetitions).toLocaleString()} reps</span><form action="/api/exercise-logs" method="post"><input type="hidden" name="action" value="delete" /><input type="hidden" name="entry_date" value={day} /><input type="hidden" name="id" value={log.id} /><button aria-label={`Delete ${log.repetitions} push-up log`} className="rounded-md px-2 py-1 text-xs text-red-700 hover:bg-red-50">Remove</button></form></div>
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 rounded-lg bg-[#faf9f5] p-4 text-sm leading-6 text-[#62685f]">No push-ups logged for this day yet. Start wherever you are.</p>}
    </section>
    {quickAdds.length > 0 && <section className="fit-card mt-6"><p className="fit-eyebrow">Your usuals</p><h2 className="mt-2 text-2xl">Quick add</h2><p className="mt-1 text-sm text-[#7b8077]">Save time with foods you’ve logged before.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{quickAdds.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-lg border border-[#efede7] bg-[#faf9f5] p-3"><form action="/api/quick-adds" method="post" className="min-w-0 flex-1"><input type="hidden" name="action" value="add"/><input type="hidden" name="entry_date" value={day}/><input type="hidden" name="id" value={item.id}/><input type="hidden" name="name" value={item.name}/><input type="hidden" name="meal" value={item.meal}/><input type="hidden" name="calories" value={item.calories}/><input type="hidden" name="protein_g" value={item.protein_g}/><input type="hidden" name="carbs_g" value={item.carbs_g}/><input type="hidden" name="fat_g" value={item.fat_g}/><input type="hidden" name="is_guessed" value={item.is_guessed ? "true" : "false"}/><button className="w-full text-left"><span className="block truncate font-semibold">{item.name} {item.is_guessed && <span className="text-xs text-[#76591e]">· Guessed</span>}</span><span className="text-xs text-[#7b8077]">{mealLabels[item.meal]} · {item.calories} kcal</span></button></form><form action="/api/quick-adds" method="post"><input type="hidden" name="action" value="delete"/><input type="hidden" name="entry_date" value={day}/><input type="hidden" name="id" value={item.id}/><button aria-label={`Remove ${item.name} from quick adds`} className="rounded-lg px-2 py-1 text-xs text-red-700">Remove</button></form></div>)}</div></section>}
    <section className="mt-7"><h2 className="text-lg font-semibold">Food entries</h2>{todayEntries.length === 0 && <p className="mt-3 rounded-2xl bg-white p-5 text-sm text-[#81877e]">No food logged for this day yet.</p>}{mealNames.map((meal) => { const items = todayEntries.filter((item) => item.meal === meal); return items.length ? <div key={meal} className="mt-4"><h3 className="mb-2 text-sm font-semibold text-[#697066]">{mealLabels[meal]}</h3><div className="space-y-3">{items.map((item) => <article key={item.id} className="fit-card-lite p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{item.name} {item.is_guessed && <span className="ml-1 rounded-full bg-[#fff3cf] px-2 py-0.5 text-xs font-medium text-[#795b15]">Guessed</span>}</p><p className="mt-1 text-sm text-[#81877e]">{Number(item.calories)} kcal · {Number(item.protein_g)} g protein · {Number(item.carbs_g)} g carbs · {Number(item.fat_g)} g fat</p></div><form action="/api/food-entries" method="post"><input type="hidden" name="action" value="delete"/><input type="hidden" name="id" value={item.id}/><input type="hidden" name="entry_date" value={day}/><button aria-label={`Delete ${item.name}`} className="rounded-lg px-2 py-1 text-sm text-red-700">Delete</button></form></div><form action="/api/quick-adds" method="post" className="mt-2"><input type="hidden" name="action" value="save"/><input type="hidden" name="entry_date" value={day}/><input type="hidden" name="name" value={item.name}/><input type="hidden" name="meal" value={item.meal}/><input type="hidden" name="calories" value={item.calories}/><input type="hidden" name="protein_g" value={item.protein_g}/><input type="hidden" name="carbs_g" value={item.carbs_g}/><input type="hidden" name="fat_g" value={item.fat_g}/><input type="hidden" name="is_guessed" value={item.is_guessed ? "true" : "false"}/><button className="rounded-lg bg-[#edf5e9] px-3 py-1.5 text-xs font-semibold text-[#315c35]">Save as quick add</button></form><details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-[#315c35]">Edit entry</summary><form action="/api/food-entries" method="post" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"><input type="hidden" name="id" value={item.id}/><input type="hidden" name="entry_date" value={day}/><label className="col-span-2 text-xs text-[#697066] sm:col-span-2">Name<input name="name" required maxLength={100} defaultValue={item.name} className="mt-1 w-full rounded-lg border border-[#dfe3d9] p-2 text-sm"/></label><label className="text-xs text-[#697066]">Meal<select name="meal" defaultValue={item.meal} className="mt-1 w-full rounded-lg border border-[#dfe3d9] bg-white p-2 text-sm">{mealNames.map((value) => <option key={value} value={value}>{mealLabels[value]}</option>)}</select></label><FoodNumber label="kcal" name="calories" defaultValue={item.calories} integer/><FoodNumber label="Protein g" name="protein_g" defaultValue={Number(item.protein_g)}/><FoodNumber label="Carbs g" name="carbs_g" defaultValue={Number(item.carbs_g)}/><FoodNumber label="Fat g" name="fat_g" defaultValue={Number(item.fat_g)}/><label className="col-span-2 flex items-center gap-2 text-xs text-[#795b15] sm:col-span-5"><input type="checkbox" name="is_guessed" value="true" defaultChecked={Boolean(item.is_guessed)}/> Keep this entry marked as guessed</label><button className="col-span-2 rounded-lg bg-[#edf5e9] p-2 text-sm font-semibold text-[#315c35] sm:col-span-5">Save changes</button></form></details></article>)}</div></div> : null; })}</section>
    <p className="mt-7 text-center text-xs text-[#81877e]">Calorie and protein targets are estimates, not medical advice.</p>
  </AppShell>;
}
function FoodNumber({ label, name, defaultValue, integer }: { label: string; name: string; defaultValue?: number; integer?: boolean }) { return <label className="text-xs font-medium text-[#697066]">{label}<input type="number" name={name} required min="0" max={integer ? 20000 : 1000} step={integer ? 1 : "0.1"} defaultValue={defaultValue ?? 0} className="mt-1.5 w-full rounded-xl border border-[#dfe3d9] px-3 py-3 text-sm"/></label>; }
function shiftDay(value: string, amount: number) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10); }
