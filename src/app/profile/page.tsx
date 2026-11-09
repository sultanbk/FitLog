import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { calculateDailyCaloriePlan } from "@/lib/calorie-target";
import { getDemoFoodMemories, getDemoState, type FoodMemory } from "@/lib/demo-session";
import { createClient } from "@/lib/supabase/server";
import { MemoryClearForm } from "@/components/memory-clear-form";
import { changePassword } from "@/app/account/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";
import { getDatabaseSetupIssue } from "@/lib/database-setup";

type Profile = {
  age_years: number;
  sex: "female" | "male";
  activity_level: "sedentary" | "light" | "moderate" | "active";
  height_cm: number;
  current_weight_kg: number;
  goal_weight_kg: number;
  goal_duration_days: number;
  protein_g_per_kg?: number;
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; settingsError?: string; memoryMessage?: string; gemini?: string; reflection?: string; mealIdeas?: string; passwordSaved?: string; passwordError?: string; profileUpdated?: string }> }) {
  const params = await searchParams;
  let profile: Profile | null = null;
  const localDemo = process.env.FITLOG_ENABLE_DEMO === "true";
  let memories: FoodMemory[] = [];
  let memoryEnabled = false;
  let geminiEnabled = false;
  let reflectionEnabled = false;
  let mealIdeasEnabled = false;

  if (localDemo) {
    const demo = await getDemoState();
    if (!demo.active) redirect("/login");
    profile = demo.profile;
    memories = await getDemoFoodMemories();
    memoryEnabled = demo.profile?.food_memory_enabled === true;
    geminiEnabled = demo.profile?.gemini_food_parsing_enabled === true;
    reflectionEnabled = demo.profile?.gemini_weekly_reflections_enabled === true;
    mealIdeasEnabled = demo.profile?.gemini_meal_ideas_enabled === true;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data, error: profileError } = await supabase.from("profiles")
      .select("age_years,sex,activity_level,height_cm,current_weight_kg,goal_weight_kg,goal_duration_days,protein_g_per_kg,food_memory_enabled,gemini_food_parsing_enabled,gemini_weekly_reflections_enabled,gemini_meal_ideas_enabled")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      const setupIssue = getDatabaseSetupIssue(profileError);
      if (setupIssue) return <DatabaseSetupNotice active="profile" issue={setupIssue} />;
      throw new Error(`Could not load your profile settings: ${profileError.message}`);
    }
    profile = data as Profile | null;
    memoryEnabled = data?.food_memory_enabled === true;
    geminiEnabled = data?.gemini_food_parsing_enabled === true;
    reflectionEnabled = data?.gemini_weekly_reflections_enabled === true;
    mealIdeasEnabled = data?.gemini_meal_ideas_enabled === true;
    const { data: savedMemories } = await supabase.from("food_memory")
      .select("id,name,serving_description,calories,protein_g,carbs_g,fat_g,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    memories = (savedMemories ?? []) as FoodMemory[];
  }

  if (!profile) redirect("/onboarding");

  const proteinRatio = Number(profile.protein_g_per_kg ?? 1.5);
  const plan = calculateDailyCaloriePlan({
    ageYears: profile.age_years,
    sex: profile.sex,
    activityLevel: profile.activity_level,
    heightCm: Number(profile.height_cm),
    currentWeightKg: Number(profile.current_weight_kg),
    goalWeightKg: Number(profile.goal_weight_kg),
    durationDays: profile.goal_duration_days,
    proteinGramsPerKg: proteinRatio,
  });
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = new Date(today + "T12:00:00+05:30");
  date.setDate(date.getDate() + plan.daysAtCappedRate);
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
  const adjustment = plan.dailySurplusDeficitCalories;
  const signOutAction = localDemo ? "/api/demo/logout" : "/api/auth/logout";
  const signOut = <form action={signOutAction} method="post" data-clear-drafts-on-submit="true"><button data-pending-label="Signing out…" className="fit-signout-button">Sign out</button></form>;

  return (
    <AppShell active="profile" mobileAction={signOut} sidebarFooter={signOut}>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="fit-eyebrow">A little about you</p><h1 className="fit-heading">Your profile</h1><p className="mt-2 text-sm leading-6 text-[#7b8077]">Your goals, preferences, and the details behind your daily plan.</p></div>
        <Link href="/settings" className="rounded-lg border border-[#d9d7cd] bg-[#fffefa] px-4 py-3 text-sm font-semibold text-[#3e5944] transition-colors hover:bg-[#eeeee5]">Edit readings</Link>
      </header>
      {params.profileUpdated && <p role="status" className="mb-4 rounded-xl bg-[#edf5e9] p-3 text-sm text-[#315c35]">Profile readings updated. Your calorie target has been recalculated.</p>}

      <nav aria-label="Profile sections" className="mb-5 flex gap-2 overflow-x-auto pb-1 text-sm">
        <a href="#goal-plan" className="shrink-0 rounded-full border border-[#e6e3da] bg-[#fffefa] px-3 py-2 text-[#62685f] hover:text-[#3e5944]">Daily plan</a>
        <a href="#nutrition" className="shrink-0 rounded-full border border-[#e6e3da] bg-[#fffefa] px-3 py-2 text-[#62685f] hover:text-[#3e5944]">Nutrition</a>
        <a href="#ai-food" className="shrink-0 rounded-full border border-[#e6e3da] bg-[#fffefa] px-3 py-2 text-[#62685f] hover:text-[#3e5944]">AI food tools</a>
        {!localDemo && <a href="#account-password" className="shrink-0 rounded-full border border-[#e6e3da] bg-[#fffefa] px-3 py-2 text-[#62685f] hover:text-[#3e5944]">Account</a>}
        <a href="#starting-point" className="shrink-0 rounded-full border border-[#e6e3da] bg-[#fffefa] px-3 py-2 text-[#62685f] hover:text-[#3e5944]">Starting point</a>
      </nav>

      <section id="goal-plan" aria-labelledby="goal-summary-title" className="scroll-mt-5 overflow-hidden rounded-2xl bg-[#35483a] p-6 text-[#fffefa] shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#d9dfd2]">Your daily plan</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="goal-summary-title" className="text-sm font-medium text-[#e5e9df]">Calorie target</h2>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{plan.dailyCalorieTarget.toLocaleString()} <span className="text-base font-medium text-[#d9dfd2]">kcal / day</span></p>
          </div>
          <p className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white">Protein {plan.proteinTargetGrams} g / day</p>
        </div>
      </section>

      <section aria-label="Calorie plan details" className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Estimated resting calories" value={plan.bmrCalories.toLocaleString() + " kcal/day"} />
        <Card label="Maintenance" value={plan.maintenanceCalories.toLocaleString() + " kcal/day"} />
        <Card label="Planned daily adjustment" value={adjustment > 0 ? "+" + adjustment.toLocaleString() + " kcal/day" : adjustment < 0 ? adjustment.toLocaleString() + " kcal/day" : "0 kcal/day"} />
        <Card label="Activity" value={profile.activity_level[0].toUpperCase() + profile.activity_level.slice(1)} />
      </section>

      {plan.capMessage && (
        <p role="status" className="fit-warning mt-4 p-4 text-sm leading-6">
          Your preferred timeline of {profile.goal_duration_days} days is faster than FitLog’s pace cap. {plan.capMessage} At the planned pace of {plan.cappedWeeklyChangeKg.toFixed(2)} kg/week, reaching {profile.goal_weight_kg} kg is estimated to take about {plan.daysAtCappedRate} days (around {dateLabel}).
        </p>
      )}
      {plan.floorMessage && <p role="status" className="fit-warning mt-3 p-4 text-sm leading-6">{plan.floorMessage}</p>}

      <section id="nutrition" aria-labelledby="protein-preference-title" className="fit-card mt-5 scroll-mt-5">
        <SectionHeading id="protein-preference-title" title="Nutrition preference" description="Choose a daily protein estimate from 1.2 to 2.0 grams per kg." />
        {params.saved && <p role="status" className="mt-4 rounded-xl bg-[#edf5e9] p-3 text-sm text-[#315c35]">Settings saved.</p>}
        {params.settingsError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.settingsError.replaceAll("+", " ")}</p>}
        <p data-draft-status className="mt-4 text-xs text-[#7b8077]">Your unfinished preference is saved only in this browser tab.</p>
        <form action="/api/profile/settings" method="post" data-draft-key="protein-preference" className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-sm font-medium text-[#454c42]">
            Protein g/kg
            <input type="number" inputMode="decimal" name="protein_g_per_kg" min="1.2" max="2.0" step="0.1" defaultValue={proteinRatio.toFixed(1)} required className="fit-input mt-1.5" />
          </label>
          <button data-pending-label="Saving…" className="fit-button-primary w-full sm:w-auto sm:min-w-28">Save preference</button>
        </form>
      </section>

      <section id="ai-food" aria-labelledby="gemini-title" className="fit-card mt-5 scroll-mt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeading id="gemini-title" title="Gemini food parsing" description="Describe a meal and Gemini will estimate its nutrition. Review and edit every item before saving." />
          <span className={geminiEnabled ? "rounded-full bg-[#edf5e9] px-3 py-1 text-xs font-semibold text-[#315c35]" : "rounded-full bg-[#f1f2ef] px-3 py-1 text-xs font-semibold text-[#697066]"}>{geminiEnabled ? "On" : "Off"}</span>
        </div>
        <p className="mt-4 rounded-2xl bg-[#f5f7f2] p-4 text-sm leading-6 text-[#697066]">
          When enabled, your food description is sent to Google Gemini. On Google’s unpaid API tier, submitted content may be used to improve Google services and may be reviewed by people. Manual entry and quick adds work either way.
        </p>
        {params.gemini && <p role="status" className="mt-3 text-sm text-[#315c35]">{params.gemini === "enabled" ? "Gemini food parsing is on." : params.gemini === "disabled" ? "Gemini food parsing is off." : "Could not update this setting."}</p>}
        <form action="/api/profile/ai-consent" method="post" className="mt-4">
          <input type="hidden" name="feature" value="food-parsing" />
          <input type="hidden" name="enabled" value={geminiEnabled ? "false" : "true"} />
          <button className="fit-button-primary">{geminiEnabled ? "Turn Gemini off" : "Turn Gemini on"}</button>
        </form>
        <p className="mt-3 text-xs leading-5 text-[#81877e]">Food memory has a separate setting and can be managed below.</p>
        <div className="mt-5 border-t border-[#efede7] pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#35483a]">Weekly reflections</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#697066]">When you request a reflection, FitLog sends Gemini only seven-day totals and weekday logging counts—not food names, individual entries, or weight. This is a separate optional setting; reflections are never generated automatically. Google’s unpaid API tier may use submitted summaries to improve its services and may allow human review.</p>
            </div>
            <span className={reflectionEnabled ? "rounded-full bg-[#edf5e9] px-3 py-1 text-xs font-semibold text-[#315c35]" : "rounded-full bg-[#f1f2ef] px-3 py-1 text-xs font-semibold text-[#697066]"}>{reflectionEnabled ? "On" : "Off"}</span>
          </div>
          {params.reflection && <p role="status" className="mt-3 text-sm text-[#315c35]">{params.reflection === "enabled" ? "Weekly reflections are on." : params.reflection === "disabled" ? "Weekly reflections are off." : "Could not update weekly reflection settings."}</p>}
          <form action="/api/profile/ai-consent" method="post" className="mt-3">
            <input type="hidden" name="feature" value="weekly-reflections" />
            <input type="hidden" name="enabled" value={reflectionEnabled ? "false" : "true"} />
            <button className="fit-button-primary">{reflectionEnabled ? "Turn reflections off" : "Turn reflections on"}</button>
          </form>
        </div>
        <div className="mt-5 border-t border-[#efede7] pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#35483a]">Meal ideas</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#697066]">When you ask for ideas on Today, Gemini receives your remaining calorie/protein estimates and up to 8 saved favorite names as inspiration. Individual logged foods are not sent. This is separate from food parsing and reflections; suggestions are never saved automatically. Google’s unpaid API tier may use submitted content to improve its services and may allow human review.</p>
            </div>
            <span className={mealIdeasEnabled ? "rounded-full bg-[#edf5e9] px-3 py-1 text-xs font-semibold text-[#315c35]" : "rounded-full bg-[#f1f2ef] px-3 py-1 text-xs font-semibold text-[#697066]"}>{mealIdeasEnabled ? "On" : "Off"}</span>
          </div>
          {params.mealIdeas && <p role="status" className="mt-3 text-sm text-[#315c35]">{params.mealIdeas === "enabled" ? "Gemini meal ideas are on." : params.mealIdeas === "disabled" ? "Gemini meal ideas are off." : "Could not update meal ideas settings."}</p>}
          <form action="/api/profile/ai-consent" method="post" className="mt-3">
            <input type="hidden" name="feature" value="meal-ideas" />
            <input type="hidden" name="enabled" value={mealIdeasEnabled ? "false" : "true"} />
            <button className="fit-button-primary">{mealIdeasEnabled ? "Turn meal ideas off" : "Turn meal ideas on"}</button>
          </form>
        </div>
      </section>

      <section id="food-memory" aria-labelledby="food-memory-title" className="fit-card mt-5 scroll-mt-5">
        <details open={Boolean(params.memoryMessage)} className="group">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span>
              <span id="food-memory-title" className="block text-base font-semibold text-[#252922]">Advanced food memory</span>
              <span className="mt-1 block text-sm text-[#7b8077]">Optional saved foods for Gemini meal estimates</span>
            </span>
            <span className="flex items-center gap-3">
              <span className={memoryEnabled ? "rounded-full bg-[#edf5e9] px-3 py-1 text-xs font-semibold text-[#315c35]" : "rounded-full bg-[#f1f2ef] px-3 py-1 text-xs font-semibold text-[#697066]"}>{memoryEnabled ? "On" : "Off"} · {memories.length}</span>
              <span aria-hidden="true" className="text-sm text-[#697066] transition-transform group-open:rotate-180">⌄</span>
            </span>
          </summary>
          <div className="mt-4 border-t border-[#efede7] pt-4">
            <p className="text-sm leading-6 text-[#697066]">When enabled, matching saved foods are included with your description sent to Gemini. Memories stay in your account and can be edited or deleted here.</p>
            <form action="/api/food-memory" method="post" className="mt-4 flex flex-wrap items-center gap-3">
              <input type="hidden" name="action" value="toggle" />
              <input type="hidden" name="enabled" value={memoryEnabled ? "false" : "true"} />
              <button className="fit-button-primary">{memoryEnabled ? "Turn memory off" : "Turn memory on"}</button>
              <span className="text-sm text-[#697066]">Memory is {memoryEnabled ? "on" : "off"}.</span>
            </form>
            {params.memoryMessage && <p role="status" className={params.memoryMessage === "error" || params.memoryMessage === "invalid" ? "mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" : "mt-4 rounded-xl bg-[#edf5e9] p-3 text-sm text-[#335c2c]"}>{memoryMessageText(params.memoryMessage)}</p>}
            {memories.length === 0 ? (
              <p className="mt-4 rounded-xl bg-[#f5f7f2] p-4 text-sm leading-6 text-[#697066]">No saved food memories yet. Confirm a food from a parsed meal and choose to remember it.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {memories.map((memory) => (
                  <article key={memory.id} className="fit-card-lite p-4">
                    <p data-draft-status className="mb-2 text-xs text-[#7b8077]">Unfinished changes are saved only in this browser tab.</p>
                    <form action="/api/food-memory" method="post" data-draft-key={`food-memory:${memory.id}`} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <input type="hidden" name="action" value="save" />
                      <input type="hidden" name="id" value={memory.id} />
                      <label className="col-span-2 text-xs font-medium text-[#697066] sm:col-span-3">
                        Food name
                        <input name="name" required maxLength={100} defaultValue={memory.name} className="fit-input mt-1" />
                      </label>
                      <label className="col-span-2 text-xs font-medium text-[#697066] sm:col-span-1">
                        Serving
                        <input name="serving_description" required maxLength={100} defaultValue={memory.serving_description} className="fit-input mt-1" />
                      </label>
                      <MemoryNumber label="kcal" name="calories" defaultValue={Number(memory.calories)} integer />
                      <MemoryNumber label="Protein g" name="protein_g" defaultValue={Number(memory.protein_g)} />
                      <MemoryNumber label="Carbs g" name="carbs_g" defaultValue={Number(memory.carbs_g)} />
                      <MemoryNumber label="Fat g" name="fat_g" defaultValue={Number(memory.fat_g)} />
                      <button data-pending-label="Saving…" className="col-span-2 rounded-xl bg-[#eef4ea] px-4 py-3 text-sm font-semibold text-[#315c35] hover:bg-[#e5eee1] sm:col-span-3">Save edits</button>
                    </form>
                    <form action="/api/food-memory" method="post" className="mt-2">
                      <input type="hidden" name="action" value="delete" />
                      <input type="hidden" name="id" value={memory.id} />
                      <button data-pending-label="Deleting…" className="rounded-lg px-2 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Delete this memory</button>
                    </form>
                  </article>
                ))}
                <div className="pt-2"><MemoryClearForm /></div>
              </div>
            )}
          </div>
        </details>
      </section>

      {!localDemo && (
        <section id="account-password" aria-labelledby="password-title" className="fit-card mt-5 scroll-mt-5">
          <SectionHeading id="password-title" title="Change password" description="Choose a password with at least 10 characters." />
          <p className="mt-2 text-xs leading-5 text-[#81877e]">If you forget it, ask Tipu to reset it from the Supabase dashboard.</p>
          {params.passwordSaved && <p role="status" className="mt-4 rounded-xl bg-[#edf5e9] p-3 text-sm text-[#315c35]">Password updated.</p>}
          {params.passwordError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.passwordError.replaceAll("+", " ")}</p>}
          <form action={changePassword} className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[#454c42]">New password<input type="password" name="password" minLength={10} maxLength={128} autoComplete="new-password" required className="fit-input mt-1.5" /></label>
            <label className="block text-sm font-medium text-[#454c42]">Confirm password<input type="password" name="confirm_password" minLength={10} maxLength={128} autoComplete="new-password" required className="fit-input mt-1.5" /></label>
            <FormSubmitButton pendingLabel="Updating…" className="fit-button-primary sm:col-span-2">Update password</FormSubmitButton>
          </form>
        </section>
      )}

      <section id="starting-point" aria-labelledby="starting-point-title" className="fit-card mt-5 scroll-mt-5">
        <SectionHeading id="starting-point-title" title="Starting point" description="The personal details used to estimate your goals." />
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 text-sm sm:grid-cols-3">
          <Stat label="Age" value={profile.age_years + " years"} />
          <Stat label="Sex" value={profile.sex === "female" ? "Female" : "Male"} />
          <Stat label="Activity" value={profile.activity_level[0].toUpperCase() + profile.activity_level.slice(1)} />
          <Stat label="Height" value={profile.height_cm + " cm"} />
          <Stat label="Starting weight" value={profile.current_weight_kg + " kg"} />
          <Stat label="Goal weight" value={profile.goal_weight_kg + " kg"} />
          {profile.goal_weight_kg !== profile.current_weight_kg && <Stat label="Preferred timeline" value={profile.goal_duration_days + " days"} />}
        </dl>
      </section>

      <p className="mt-6 text-center text-xs leading-5 text-[#81877e]">Calorie and protein targets are estimates, not medical advice.</p>
    </AppShell>
  );
}

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return <div>
    <h2 id={id} className="text-xl">{title}</h2>
    <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7b8077]">{description}</p>
  </div>;
}

function Card({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[#e6e3da] bg-[#fffefa] p-4">
    <p className="text-xs leading-5 text-[#7b8077]">{label}</p>
    <p className="mt-2 text-sm font-semibold">{value}</p>
  </div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div>
    <dt className="text-xs text-[#81877e]">{label}</dt>
    <dd className="mt-1 font-medium">{value}</dd>
  </div>;
}

function MemoryNumber({ label, name, defaultValue, integer }: { label: string; name: string; defaultValue: number; integer?: boolean }) {
  return <label className="block text-xs font-medium text-[#697066]">
    {label}
    <input name={name} type="number" required min="0" max={integer ? 20000 : 1000} step={integer ? 1 : "0.1"} defaultValue={defaultValue} className="fit-input mt-1 text-sm" />
  </label>;
}

function memoryMessageText(value: string) {
  return ({
    enabled: "Food memory is on.",
    disabled: "Food memory is off.",
    saved: "Remembered food updated.",
    deleted: "Remembered food deleted.",
    cleared: "All remembered foods cleared.",
    invalid: "Check the food details and try again.",
    error: "Could not update food memory.",
  } as Record<string, string>)[value] ?? "Food memory updated.";
}