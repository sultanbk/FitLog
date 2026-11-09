import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";
import { NaturalLanguageLogger } from "@/components/natural-language-logger";
import { MealIdeas } from "@/components/meal-ideas";
import { QuickAddCard } from "@/components/quick-add-card";
import { getDatabaseSetupIssue } from "@/lib/database-setup";
import { hasGeminiKey } from "@/lib/gemini-api-key";
import { createClient } from "@/lib/supabase/server";
import { getDemoFoodEntries, getDemoQuickAdds, getDemoState, type FoodEntry, type QuickAdd } from "@/lib/demo-session";

const mealNames = ["breakfast", "lunch", "snack", "dinner"] as const;
const mealLabels: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };
const notices: Record<string, string> = {
  "food-added": "Food logged.",
  "food-updated": "Food entry updated.",
  "food-deleted": "Food entry removed.",
  "favorite-saved": "Saved to your favorites.",
  "favorite-updated": "Favorite updated.",
  "favorite-removed": "Favorite removed.",
};
export default async function TodayPage({ searchParams }: { searchParams: Promise<{ day?: string; saved?: string; error?: string; memoryWarning?: string; notice?: string }> }) {
  const params = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const day = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) && Date.parse(`${params.day}T00:00:00Z`) <= Date.parse(`${today}T00:00:00Z`) ? params.day : today;
  let profile: { daily_calorie_target: number; maintenance_calories: number | null; current_weight_kg: number; protein_g_per_kg: number } | null = null;
  let entries: FoodEntry[] = [];
  let quickAdds: QuickAdd[] = [];
  let geminiEnabled = hasGeminiKey(false, process.env.GEMINI_API_KEY);
  let mealIdeasEnabled = false;
  if (process.env.FITLOG_ENABLE_DEMO === "true") {
    const [demo, foodEntries, savedQuickAdds] = await Promise.all([
      getDemoState(),
      getDemoFoodEntries(),
      getDemoQuickAdds(),
    ]);
    if (!demo.active) redirect("/login");
    if (demo.profile) profile = { daily_calorie_target: demo.profile.daily_calorie_target ?? 2000, maintenance_calories: demo.profile.maintenance_calories ?? null, current_weight_kg: demo.profile.current_weight_kg, protein_g_per_kg: demo.profile.protein_g_per_kg ?? 1.5 };
    mealIdeasEnabled = geminiEnabled;
    entries = foodEntries;
    quickAdds = savedQuickAdds;
  } else {
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login");
    const keyStatusPromise = geminiEnabled ? Promise.resolve(null) : supabase.rpc("has_my_gemini_key");
    const [profileResult, foodResult, quickAddsResult, keyStatusResult] = await Promise.all([
      supabase.from("profiles").select("daily_calorie_target,maintenance_calories,current_weight_kg,protein_g_per_kg,age_years").eq("id", user.id).maybeSingle(),
      supabase.from("food_entries").select("id,entry_date,name,meal,calories,protein_g,carbs_g,fat_g,is_guessed,created_at").eq("user_id", user.id).eq("entry_date", day).order("created_at", { ascending: false }),
      supabase.from("quick_adds").select("id,name,meal,calories,protein_g,carbs_g,fat_g,is_guessed,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      keyStatusPromise,
    ]);
    if (keyStatusResult?.error) {
      const setupIssue = getDatabaseSetupIssue(keyStatusResult.error);
      if (setupIssue) return <DatabaseSetupNotice active="today" issue={setupIssue} />;
      throw new Error(`Could not check your Gemini key status: ${keyStatusResult.error.message}`);
    }
    geminiEnabled = hasGeminiKey(keyStatusResult?.data === true, process.env.GEMINI_API_KEY);
    mealIdeasEnabled = geminiEnabled;
    const { data, error: profileError } = profileResult;
    if (profileError) {
      const setupIssue = getDatabaseSetupIssue(profileError);
      if (setupIssue) return <DatabaseSetupNotice active="today" issue={setupIssue} />;
      throw new Error(`Could not load your profile: ${profileError.message}`);
    }
    if (data?.age_years != null) profile = { daily_calorie_target: data.daily_calorie_target, maintenance_calories: data.maintenance_calories, current_weight_kg: Number(data.current_weight_kg), protein_g_per_kg: Number(data.protein_g_per_kg ?? 1.5) };
    const { data: rows, error: foodError } = foodResult;
    if (foodError) {
      const setupIssue = getDatabaseSetupIssue(foodError);
      if (setupIssue) return <DatabaseSetupNotice active="today" issue={setupIssue} />;
      throw new Error(`Could not load your food entries: ${foodError.message}`);
    }
    entries = (rows ?? []) as FoodEntry[];
    const { data: savedFoods, error: quickAddsError } = quickAddsResult;
    if (quickAddsError) {
      const setupIssue = getDatabaseSetupIssue(quickAddsError);
      if (setupIssue) return <DatabaseSetupNotice active="today" issue={setupIssue} />;
      throw new Error(`Could not load your quick adds: ${quickAddsError.message}`);
    }
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
  const dateLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(`${day}T12:00:00+05:30`));
  return <AppShell active="today">

    <header className="mb-6 flex items-end justify-between gap-4">
      <div><p className="fit-eyebrow">A moment for yourself</p><h1 className="fit-heading">{day === today ? "Today, gently." : dateLabel}</h1><p className="mt-2 text-sm text-[#7b8077]">{dateLabel}</p></div>
      <div className="mb-1 flex shrink-0 items-center gap-2"><a aria-label="Previous day" href={`/today?day=${previous}`} className="grid size-10 place-items-center rounded-full border border-[#e6e3da] bg-[#fffefa] text-xl text-[#62685f] transition-colors hover:bg-[#eeeee5]">‹</a>{day < today ? <a aria-label="Next day" href={`/today?day=${next}`} className="grid size-10 place-items-center rounded-full border border-[#e6e3da] bg-[#fffefa] text-xl text-[#62685f] transition-colors hover:bg-[#eeeee5]">›</a> : <span className="grid size-10 place-items-center rounded-full text-xl text-[#c7ccc4]" aria-hidden="true">›</span>}</div>
    </header>
    {params.saved && <p role="status" className="mt-4 rounded-xl bg-[#edf5e9] p-3 text-sm text-[#335c2c]">{(params.notice && notices[params.notice]) || "Changes saved."}</p>}{params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error.replaceAll("+", " ")}</p>}
    {params.memoryWarning && <p role="alert" className="mt-2 rounded-xl bg-[#fff8e7] p-3 text-sm text-[#795b15]">Food was logged, but the remembered item wasn’t saved. Parse the food again to retry saving it to memory.</p>}
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

    <nav aria-label="Today shortcuts" className="mt-4 flex flex-wrap gap-2">
      <a href="#food-journal" className="fit-button-primary inline-flex items-center justify-center px-4 py-2.5 text-sm">Log food</a>
      {quickAdds.length > 0 && <a href="#saved-favorites" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d9d7cd] bg-[#fffefa] px-4 py-2.5 text-sm font-semibold text-[#3e5944] transition-colors hover:bg-[#eeeee5]">Use a saved favorite</a>}
    </nav>

    <section id="food-journal" className="fit-card mt-6 scroll-mt-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="fit-eyebrow">Food journal</p>
          <h2 className="mt-2 text-2xl">Log what you ate</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7b8077]">Describe a meal for an editable nutrition estimate, or choose a saved favorite below. You can also enter nutrition manually.</p>
        </div>
      </div>
      <NaturalLanguageLogger day={day} enabled={geminiEnabled} />
      {quickAdds.length > 0 && (
        <section id="saved-favorites" className="mt-6 scroll-mt-5 border-t border-[#efede7] pt-5" aria-labelledby="saved-favorites-title">
          <p className="fit-eyebrow">One-tap logging</p>
          <h3 id="saved-favorites-title" className="mt-2 text-xl">Your usuals</h3>
          <p className="mt-1 text-sm leading-6 text-[#7b8077]">Add a saved meal directly to this day.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{quickAdds.map((item) => <QuickAddCard key={item.id} item={item} day={day} />)}</div>
        </section>
      )}
      <details className="mt-5 border-t border-[#efede7] pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-[#3e5944]">Enter nutrition manually</summary>
        <p data-draft-status className="mt-3 text-xs text-[#7b8077]">Unfinished details are saved only in this browser tab.</p>
        <form action="/api/food-entries" method="post" data-draft-key={`manual-food:${day}`} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input type="hidden" name="entry_date" value={day} />
          <label className="col-span-2 text-xs font-medium text-[#62685f] sm:col-span-3">Food name
            <input required maxLength={100} name="name" autoComplete="off" placeholder="e.g. Oats with milk" className="fit-input mt-1.5" />
          </label>
          <label className="text-xs font-medium text-[#62685f]">Meal
            <select name="meal" className="fit-input mt-1.5">{mealNames.map((meal) => <option key={meal} value={meal}>{mealLabels[meal]}</option>)}</select>
          </label>
          <FoodNumber label="Calories (kcal)" name="calories" integer />
          <FoodNumber label="Protein (g)" name="protein_g" />
          <FoodNumber label="Carbs (g)" name="carbs_g" />
          <FoodNumber label="Fat (g)" name="fat_g" />
          <button data-pending-label="Adding…" className="fit-button-primary min-h-12 col-span-2 mt-1 sm:col-span-4">Add food</button>
        </form>
      </details>
    </section>
    <section className="mt-7" aria-labelledby="food-entries-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="food-entries-title" className="text-lg font-semibold">Food entries</h2>
        <span className="text-sm tabular-nums text-[#7b8077]">{todayEntries.length} {todayEntries.length === 1 ? "entry" : "entries"}</span>
      </div>
      {todayEntries.length === 0 && <div className="mt-3 rounded-2xl border border-dashed border-[#d9d7cd] bg-[#fffefa] p-5"><p className="font-medium text-[#454c42]">Nothing logged for this day yet</p><p className="mt-1 text-sm leading-6 text-[#81877e]">Start with a meal description, a saved favorite, or a manual entry above.</p><a href="#food-journal" className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#3e5944] underline underline-offset-4">Go to food logging</a></div>}
      {mealNames.map((meal) => {
        const items = todayEntries.filter((item) => item.meal === meal);
        return items.length ? (
          <div key={meal} className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-[#697066]">{mealLabels[meal]}</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <article key={item.id} className="fit-card-lite p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.name} {item.is_guessed && <span className="ml-1 rounded-full bg-[#fff3cf] px-2 py-0.5 text-xs font-medium text-[#795b15]">Guessed</span>}</p>
                      <p className="mt-1 text-sm text-[#81877e]">{Number(item.calories)} kcal · {Number(item.protein_g)} g protein · {Number(item.carbs_g)} g carbs · {Number(item.fat_g)} g fat</p>
                    </div>
                    <form action="/api/food-entries" method="post">
                      <input type="hidden" name="action" value="delete" />
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="entry_date" value={day} />
                      <button aria-label={`Delete ${item.name}`} data-pending-label="Deleting…" className="rounded-lg px-2 py-1 text-sm text-red-700">Delete</button>
                    </form>
                  </div>
                  <form action="/api/quick-adds" method="post" className="mt-2">
                    <input type="hidden" name="action" value="save" />
                    <input type="hidden" name="entry_date" value={day} />
                    <input type="hidden" name="name" value={item.name} />
                    <input type="hidden" name="meal" value={item.meal} />
                    <input type="hidden" name="calories" value={item.calories} />
                    <input type="hidden" name="protein_g" value={item.protein_g} />
                    <input type="hidden" name="carbs_g" value={item.carbs_g} />
                    <input type="hidden" name="fat_g" value={item.fat_g} />
                    <input type="hidden" name="is_guessed" value={item.is_guessed ? "true" : "false"} />
                    <button data-pending-label="Saving…" className="rounded-lg bg-[#edf5e9] px-3 py-1.5 text-xs font-semibold text-[#315c35]">Save as quick add</button>
                  </form>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-[#315c35]">Edit entry</summary>
                    <p data-draft-status className="mt-2 text-xs text-[#7b8077]">Unfinished changes are saved only in this browser tab.</p>
                    <form action="/api/food-entries" method="post" data-draft-key={`food-edit:${day}:${item.id}`} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="entry_date" value={day} />
                      <label className="col-span-2 text-xs text-[#697066] sm:col-span-2">Name
                        <input name="name" required maxLength={100} defaultValue={item.name} className="fit-input mt-1" />
                      </label>
                      <label className="text-xs text-[#697066]">Meal
                        <select name="meal" defaultValue={item.meal} className="fit-input mt-1">{mealNames.map((value) => <option key={value} value={value}>{mealLabels[value]}</option>)}</select>
                      </label>
                      <FoodNumber label="kcal" name="calories" defaultValue={item.calories} integer />
                      <FoodNumber label="Protein g" name="protein_g" defaultValue={Number(item.protein_g)} />
                      <FoodNumber label="Carbs g" name="carbs_g" defaultValue={Number(item.carbs_g)} />
                      <FoodNumber label="Fat g" name="fat_g" defaultValue={Number(item.fat_g)} />
                      <label className="col-span-2 flex items-center gap-2 text-xs text-[#795b15] sm:col-span-5">
                        <input type="checkbox" name="is_guessed" value="true" defaultChecked={Boolean(item.is_guessed)} />
                        Keep this entry marked as guessed
                      </label>
                      <button data-pending-label="Saving…" className="fit-button-primary col-span-2 sm:col-span-5">Save changes</button>
                    </form>
                  </details>
                </article>
              ))}
            </div>
          </div>
        ) : null;
      })}
    </section>
    {day === today && <MealIdeas enabled={mealIdeasEnabled} />}
    <p className="mt-7 text-center text-xs text-[#81877e]">Calorie and protein targets are estimates, not medical advice.</p>
  </AppShell>;
}
function FoodNumber({ label, name, defaultValue, integer }: { label: string; name: string; defaultValue?: number; integer?: boolean }) { return <label className="text-xs font-medium text-[#697066]">{label}<input type="number" inputMode={integer ? "numeric" : "decimal"} name={name} required min="0" max={integer ? 20000 : 1000} step={integer ? 1 : "0.1"} defaultValue={defaultValue ?? 0} className="fit-input mt-1.5"/></label>; }
function shiftDay(value: string, amount: number) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10); }
