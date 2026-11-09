import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { GeminiKeyManager } from "@/components/gemini-key-manager";
import { MemoryClearForm } from "@/components/memory-clear-form";
import { changePassword } from "@/app/account/actions";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";
import { getDatabaseSetupIssue } from "@/lib/database-setup";
import { getDemoFoodMemories, getDemoState, type FoodMemory } from "@/lib/demo-session";
import { createClient } from "@/lib/supabase/server";

type SettingsProfile = {
  protein_g_per_kg?: number;
  food_memory_enabled?: boolean;
  gemini_food_parsing_enabled?: boolean;
  gemini_weekly_reflections_enabled?: boolean;
  gemini_meal_ideas_enabled?: boolean;
};

type SettingsParams = {
  saved?: string;
  settingsError?: string;
  memoryMessage?: string;
  gemini?: string;
  reflection?: string;
  mealIdeas?: string;
  passwordSaved?: string;
  passwordError?: string;
  clearDataError?: string;
  geminiKey?: string;
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<SettingsParams> }) {
  const params = await searchParams;
  const localDemo = process.env.FITLOG_ENABLE_DEMO === "true";
  let profile: SettingsProfile | null = null;
  let memories: FoodMemory[] = [];
  let hasPersonalGeminiKey = false;
  let keyStoreReady = !localDemo;

  if (localDemo) {
    const demo = await getDemoState();
    if (!demo.active) redirect("/login");
    if (!demo.profile) redirect("/onboarding");
    profile = demo.profile;
    memories = await getDemoFoodMemories();
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data, error } = await supabase.from("profiles")
      .select("protein_g_per_kg,food_memory_enabled,gemini_food_parsing_enabled,gemini_weekly_reflections_enabled,gemini_meal_ideas_enabled")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      const setupIssue = getDatabaseSetupIssue(error);
      if (setupIssue) return <DatabaseSetupNotice active="settings" issue={setupIssue} />;
      throw new Error(`Could not load your settings: ${error.message}`);
    }
    if (!data) redirect("/onboarding");
    profile = data;
    const [{ data: savedMemories, error: memoriesError }, { data: keyStatus, error: keyStatusError }] = await Promise.all([
      supabase.from("food_memory")
        .select("id,name,serving_description,calories,protein_g,carbs_g,fat_g,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase.rpc("has_my_gemini_key"),
    ]);
    if (memoriesError) throw new Error(`Could not load food memory settings: ${memoriesError.message}`);
    memories = (savedMemories ?? []) as FoodMemory[];
    if (keyStatusError) {
      const setupIssue = getDatabaseSetupIssue(keyStatusError);
      if (setupIssue) return <DatabaseSetupNotice active="settings" issue={setupIssue} />;
      keyStoreReady = false;
      throw new Error(`Could not check personal Gemini key status: ${keyStatusError.message}`);
    } else {
      hasPersonalGeminiKey = keyStatus === true;
    }
  }

  if (!profile) redirect("/onboarding");
  const proteinRatio = Number(profile.protein_g_per_kg ?? 1.5);
  const geminiEnabled = profile.gemini_food_parsing_enabled === true;
  const reflectionEnabled = profile.gemini_weekly_reflections_enabled === true;
  const mealIdeasEnabled = profile.gemini_meal_ideas_enabled === true;
  const memoryEnabled = profile.food_memory_enabled === true;
  const signOutAction = localDemo ? "/api/demo/logout" : "/api/auth/logout";
  const signOut = <form action={signOutAction} method="post" data-clear-drafts-on-submit="true"><button data-pending-label="Signing out…" className="fit-signout-button">Sign out</button></form>;

  return (
    <AppShell active="settings" mobileAction={signOut} sidebarFooter={signOut}>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="fit-eyebrow">Make FitLog yours</p>
          <h1 className="fit-heading">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7b8077]">Manage your nutrition preferences, AI privacy, account, and saved data in one place.</p>
        </div>
        <Link href="/settings/profile" className="rounded-lg border border-[#d9d7cd] bg-[#fffefa] px-4 py-3 text-sm font-semibold text-[#3e5944] transition-colors hover:bg-[#eeeee5]">Edit readings</Link>
      </header>

      <nav aria-label="Settings sections" className="mb-5 flex gap-2 overflow-x-auto pb-1 text-sm">
        <a href="#preferences" className="shrink-0 rounded-full border border-[#e6e3da] bg-[#fffefa] px-3 py-2 text-[#62685f] hover:text-[#3e5944]">Preferences</a>
        <a href="#ai-privacy" className="shrink-0 rounded-full border border-[#e6e3da] bg-[#fffefa] px-3 py-2 text-[#62685f] hover:text-[#3e5944]">AI & privacy</a>
        <a href="#food-memory" className="shrink-0 rounded-full border border-[#e6e3da] bg-[#fffefa] px-3 py-2 text-[#62685f] hover:text-[#3e5944]">Food memory</a>
        <a href="#account-data" className="shrink-0 rounded-full border border-[#e6e3da] bg-[#fffefa] px-3 py-2 text-[#62685f] hover:text-[#3e5944]">Account & data</a>
      </nav>

      <section id="preferences" aria-labelledby="preference-title" className="fit-card scroll-mt-5">
        <SectionHeading id="preference-title" title="Nutrition preference" description="Choose a daily protein estimate from 1.2 to 2.0 grams per kg." />
        {params.saved && <p role="status" className="mt-4 rounded-xl bg-[#edf5e9] p-3 text-sm text-[#315c35]">Settings saved.</p>}
        {params.settingsError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.settingsError.replaceAll("+", " ")}</p>}
        <p data-draft-status className="mt-4 text-xs text-[#7b8077]">Your unfinished preference is saved only in this browser tab.</p>
        <form action="/api/profile/settings" method="post" data-draft-key="protein-preference" className="mt-2 grid gap-3 sm:max-w-lg sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-sm font-medium text-[#454c42]">
            Protein g/kg
            <input type="number" inputMode="decimal" name="protein_g_per_kg" min="1.2" max="2.0" step="0.1" defaultValue={proteinRatio.toFixed(1)} required className="fit-input mt-1.5" />
          </label>
          <button data-pending-label="Saving…" className="fit-button-primary w-full sm:w-auto">Save preference</button>
        </form>
      </section>

      <section id="ai-privacy" aria-labelledby="ai-title" className="mt-5 scroll-mt-5">
        <div className="mb-4">
          <p className="fit-eyebrow">Optional tools</p>
          <h2 id="ai-title" className="text-2xl">AI & privacy</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7b8077]">Each Gemini feature is independently opt-in. You can turn any feature off here.</p>
        </div>

        <GeminiKeyManager
          isConfigured={hasPersonalGeminiKey}
          sharedKeyAvailable={Boolean(process.env.GEMINI_API_KEY)}
          encryptionConfigured={/^[\da-f]{64}$/i.test(process.env.GEMINI_USER_KEY_ENCRYPTION_SECRET ?? "")}
          keyStoreReady={keyStoreReady}
          demo={localDemo}
          result={params.geminiKey}
        />
        {!localDemo && !keyStoreReady && (
          <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Apply Supabase migration <code>20261110000600_user_gemini_keys.sql</code> to enable secure personal-key storage.
          </p>
        )}

        <div className="fit-card mt-4 space-y-5">
          <ConsentSetting
            title="Gemini food parsing"
            description="Describe a meal and Gemini will estimate its nutrition. Review and edit every item before saving. Your food description is sent to Google; Google’s unpaid API tier may use submitted content to improve Google services and may allow human review."
            enabled={geminiEnabled}
            result={params.gemini}
            enabledMessage="Gemini food parsing is on."
            disabledMessage="Gemini food parsing is off."
            feature="food-parsing"
          />
          <ConsentSetting
            title="Weekly reflections"
            description="When requested, FitLog sends only seven-day totals and weekday logging counts—not food names, individual entries, or weight. Reflections are never generated automatically. Google’s unpaid API tier may use submitted summaries to improve its services and may allow human review."
            enabled={reflectionEnabled}
            result={params.reflection}
            enabledMessage="Weekly reflections are on."
            disabledMessage="Weekly reflections are off."
            feature="weekly-reflections"
          />
          <ConsentSetting
            title="Meal ideas"
            description="When requested, Gemini receives your remaining calorie/protein estimates and up to eight saved favorite names as inspiration. Individual logged foods are not sent, and suggestions are never saved automatically. Nutrition is estimated."
            enabled={mealIdeasEnabled}
            result={params.mealIdeas}
            enabledMessage="Gemini meal ideas are on."
            disabledMessage="Gemini meal ideas are off."
            feature="meal-ideas"
          />
        </div>
      </section>

      <section id="food-memory" aria-labelledby="food-memory-title" className="fit-card mt-5 scroll-mt-5">
        <details open={Boolean(params.memoryMessage)} className="group">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span>
              <span id="food-memory-title" className="block text-base font-semibold text-[#252922]">Food memory</span>
              <span className="mt-1 block text-sm text-[#7b8077]">Optional personal food references for Gemini</span>
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
                      <label className="col-span-2 text-xs font-medium text-[#697066] sm:col-span-3">Food name<input name="name" required maxLength={100} defaultValue={memory.name} className="fit-input mt-1" /></label>
                      <label className="col-span-2 text-xs font-medium text-[#697066] sm:col-span-1">Serving<input name="serving_description" required maxLength={100} defaultValue={memory.serving_description} className="fit-input mt-1" /></label>
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

      <section id="account-data" aria-labelledby="account-data-title" className="mt-5 scroll-mt-5">
        <div className="mb-4">
          <p className="fit-eyebrow">Your account</p>
          <h2 id="account-data-title" className="text-2xl">Account & data</h2>
        </div>
        {!localDemo && (
          <section aria-labelledby="password-title" className="fit-card">
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

        <section aria-labelledby="data-management-title" className="mt-4 rounded-2xl border border-red-200 bg-[#fffefa] p-5 sm:p-6">
          <SectionHeading id="data-management-title" title="Clear all data" description="Permanently remove your FitLog profile and all logged or saved data. Your sign-in account stays active, and you’ll set up your profile again." />
          {params.clearDataError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">We couldn’t clear your data. Please try again. If the problem continues, make sure the latest Supabase migration has been applied.</p>}
          <p className="mt-4 text-sm leading-6 text-[#697066]">This removes your food logs, exercise logs, weigh-ins, saved quick adds, food memory, profile details, goals, AI preferences, and your encrypted personal Gemini key. This cannot be undone.</p>
          <form action={localDemo ? "/api/demo/clear-data" : "/api/profile/clear-data"} method="post" className="mt-4 grid gap-3 sm:max-w-md">
            <label className="text-sm font-medium text-[#454c42]">Type <span className="font-bold">CLEAR</span> to confirm<input name="confirmation" type="text" autoComplete="off" required pattern="CLEAR" title="Type CLEAR exactly to confirm." className="fit-input mt-1.5" /></label>
            <button data-pending-label="Clearing…" className="w-full rounded-xl bg-red-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-800 sm:w-auto">Clear all data</button>
          </form>
        </section>
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

function ConsentSetting({
  title,
  description,
  enabled,
  result,
  enabledMessage,
  disabledMessage,
  feature,
}: {
  title: string;
  description: string;
  enabled: boolean;
  result?: string;
  enabledMessage: string;
  disabledMessage: string;
  feature: string;
}) {
  const status = result === "enabled" ? enabledMessage : result === "disabled" ? disabledMessage : result === "error" ? "Could not update this setting." : null;
  return <div className="border-b border-[#efede7] pb-5 last:border-0 last:pb-0">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-[#35483a]">{title}</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[#697066]">{description}</p>
      </div>
      <span className={enabled ? "rounded-full bg-[#edf5e9] px-3 py-1 text-xs font-semibold text-[#315c35]" : "rounded-full bg-[#f1f2ef] px-3 py-1 text-xs font-semibold text-[#697066]"}>{enabled ? "On" : "Off"}</span>
    </div>
    {status && <p role={result === "error" ? "alert" : "status"} className={result === "error" ? "mt-3 text-sm text-red-700" : "mt-3 text-sm text-[#315c35]"}>{status}</p>}
    <form action="/api/profile/ai-consent" method="post" className="mt-3">
      <input type="hidden" name="feature" value={feature} />
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <button className="fit-button-primary">{enabled ? "Turn off" : "Turn on"} {title.toLowerCase()}</button>
    </form>
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
