import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FitLogCoach } from "@/components/fitlog-coach";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";
import { calculateDailyCaloriePlan } from "@/lib/calorie-target";
import { getDatabaseSetupIssue } from "@/lib/database-setup";
import { getDemoState } from "@/lib/demo-session";
import { hasGeminiKey } from "@/lib/gemini-api-key";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  age_years: number;
  sex: "female" | "male";
  activity_level: "sedentary" | "light" | "moderate" | "active";
  height_cm: number;
  current_weight_kg: number;
  goal_weight_kg: number;
  goal_duration_days: number;
  protein_g_per_kg?: number;
  gemini_coach_enabled?: boolean;
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ profileUpdated?: string }> }) {
  const params = await searchParams;
  const localDemo = process.env.FITLOG_ENABLE_DEMO === "true";
  let profile: Profile | null = null;
  let coachAvailable = hasGeminiKey(false, process.env.GEMINI_API_KEY);
  if (localDemo) {
    const demo = await getDemoState();
    if (!demo.active) redirect("/login");
    profile = demo.profile;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const keyStatusPromise = coachAvailable ? Promise.resolve(null) : supabase.rpc("has_my_gemini_key");
    const [{ data, error }, keyStatus] = await Promise.all([
      supabase.from("profiles")
        .select("age_years,sex,activity_level,height_cm,current_weight_kg,goal_weight_kg,goal_duration_days,protein_g_per_kg,gemini_coach_enabled")
        .eq("id", user.id)
        .maybeSingle(),
      keyStatusPromise,
    ]);
    if (error) {
      const setupIssue = getDatabaseSetupIssue(error);
      if (setupIssue) return <DatabaseSetupNotice active="profile" issue={setupIssue} />;
      throw new Error(`Could not load your profile: ${error.message}`);
    }
    if (keyStatus?.error) {
      const setupIssue = getDatabaseSetupIssue(keyStatus.error);
      if (setupIssue) return <DatabaseSetupNotice active="profile" issue={setupIssue} />;
      throw new Error(`Could not check your Gemini key status: ${keyStatus.error.message}`);
    }
    coachAvailable = hasGeminiKey(keyStatus?.data === true, process.env.GEMINI_API_KEY);
    profile = data as Profile | null;
  }
  if (!profile) redirect("/onboarding");

  const plan = calculateDailyCaloriePlan({
    ageYears: profile.age_years,
    sex: profile.sex,
    activityLevel: profile.activity_level,
    heightCm: Number(profile.height_cm),
    currentWeightKg: Number(profile.current_weight_kg),
    goalWeightKg: Number(profile.goal_weight_kg),
    durationDays: profile.goal_duration_days,
    proteinGramsPerKg: Number(profile.protein_g_per_kg ?? 1.5),
  });
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  let dateLabel: string | null = null;
  if (plan.estimatedDaysToGoal !== null) {
    const estimatedDate = new Date(`${today}T12:00:00+05:30`);
    estimatedDate.setDate(estimatedDate.getDate() + plan.estimatedDaysToGoal);
    dateLabel = new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(estimatedDate);
  }
  const signOutAction = localDemo ? "/api/demo/logout" : "/api/auth/logout";
  const signOut = <form action={signOutAction} method="post" data-clear-drafts-on-submit="true"><button data-pending-label="Signing out…" className="fit-signout-button">Sign out</button></form>;

  return (
    <AppShell active="profile" mobileAction={signOut} sidebarFooter={signOut}>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="fit-eyebrow">Your personal overview</p>
          <h1 className="fit-heading">Your profile</h1>
          <p className="mt-2 text-sm leading-6 text-[#7b8077]">A clear view of your plan and the details behind it.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/settings/profile" className="rounded-lg border border-[#d9d7cd] bg-[#fffefa] px-4 py-3 text-sm font-semibold text-[#3e5944] transition-colors hover:bg-[#eeeee5]">Edit readings</Link>
          <Link href="/settings" className="fit-button-primary">Settings</Link>
        </div>
      </header>
      {params.profileUpdated && <p role="status" className="mb-4 rounded-xl bg-[#edf5e9] p-3 text-sm text-[#315c35]">Profile readings updated. Your calorie target has been recalculated.</p>}

      <section aria-labelledby="daily-plan-title" className="overflow-hidden rounded-2xl bg-[#35483a] p-6 text-[#fffefa] shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#d9dfd2]">Your daily plan</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="daily-plan-title" className="text-sm font-medium text-[#e5e9df]">Calorie target</h2>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{plan.dailyCalorieTarget.toLocaleString()} <span className="text-base font-medium text-[#d9dfd2]">kcal / day</span></p>
          </div>
          <p className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white">Protein {plan.proteinTargetGrams} g / day</p>
        </div>
      </section>

      <section aria-label="Calorie plan details" className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Estimated resting calories" value={`${plan.bmrCalories.toLocaleString()} kcal/day`} />
        <Card label="Maintenance" value={`${plan.maintenanceCalories.toLocaleString()} kcal/day`} />
        <Card label="Daily adjustment" value={plan.dailySurplusDeficitCalories > 0 ? `+${plan.dailySurplusDeficitCalories.toLocaleString()} kcal/day` : `${plan.dailySurplusDeficitCalories.toLocaleString()} kcal/day`} />
        <Card label="Activity" value={capitalize(profile.activity_level)} />
      </section>

      {(plan.capApplied || plan.floorApplied) && (
        <p role="status" className="fit-warning mt-4 p-4 text-sm leading-6">
          Your preferred timeline is {profile.goal_duration_days} days. {plan.capMessage} {plan.floorMessage} {dateLabel && Math.abs(plan.estimatedWeeklyWeightChangeKg) > 0
            ? `The adjusted estimate is about ${Math.abs(plan.estimatedWeeklyWeightChangeKg).toFixed(2)} kg/week, so reaching ${profile.goal_weight_kg} kg may take roughly ${plan.estimatedDaysToGoal} days (around ${dateLabel}).`
            : "The adjusted calorie target does not imply progress toward this weight goal, so FitLog can’t provide a time-to-goal estimate."} This is a rough estimate, not a prediction; actual weight changes vary.
        </p>
      )}

      <section aria-labelledby="starting-point-title" className="fit-card mt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="starting-point-title" className="text-xl">Your starting point</h2>
            <p className="mt-1 text-sm leading-6 text-[#7b8077]">The personal details used to estimate your plan.</p>
          </div>
          <Link href="/settings/profile" className="text-sm font-semibold text-[#3e5944] hover:underline">Edit readings</Link>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 text-sm sm:grid-cols-3">
          <Stat label="Age" value={`${profile.age_years} years`} />
          <Stat label="Sex" value={profile.sex === "female" ? "Female" : "Male"} />
          <Stat label="Activity" value={capitalize(profile.activity_level)} />
          <Stat label="Height" value={`${profile.height_cm} cm`} />
          <Stat label="Starting weight" value={`${profile.current_weight_kg} kg`} />
          <Stat label="Goal weight" value={`${profile.goal_weight_kg} kg`} />
          {profile.goal_weight_kg !== profile.current_weight_kg && <Stat label="Preferred timeline" value={`${profile.goal_duration_days} days`} />}
        </dl>
      </section>

      <FitLogCoach consented={profile.gemini_coach_enabled === true} available={coachAvailable} />

      <Link href="/settings" className="mt-4 flex items-center justify-between rounded-2xl border border-[#e6e3da] bg-[#fffefa] p-5 text-sm transition-colors hover:bg-[#f5f7f2]">
        <span><span className="block font-semibold text-[#35483a]">Preferences, AI privacy & account</span><span className="mt-1 block text-[#7b8077]">Manage your Gemini key, password, and data.</span></span>
        <span aria-hidden="true" className="ml-4 text-lg text-[#697066]">→</span>
      </Link>
      <p className="mt-6 text-center text-xs leading-5 text-[#81877e]">Calorie and protein targets are estimates, not medical advice.</p>
    </AppShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[#e6e3da] bg-[#fffefa] p-4">
    <p className="text-xs leading-5 text-[#7b8077]">{label}</p>
    <p className="mt-2 text-sm font-semibold">{value}</p>
  </div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-[#81877e]">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}

function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}
