import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DatabaseSetupNotice } from "@/components/database-setup-notice";
import { getDatabaseSetupIssue } from "@/lib/database-setup";
import { getDemoExerciseLogs, getDemoState, type ExerciseLog } from "@/lib/demo-session";
import { isValidExerciseLogDate } from "@/lib/exercise-logs";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  day?: string;
  exerciseSaved?: string;
  exerciseError?: string;
};

function todayInAppTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export default async function ExercisePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const today = todayInAppTimezone();
  const day = params.day && isValidExerciseLogDate(params.day) && params.day <= today ? params.day : today;
  let logs: ExerciseLog[] = [];

  if (process.env.FITLOG_ENABLE_DEMO === "true") {
    const demo = await getDemoState();
    if (!demo.active) redirect("/login");
    if (!demo.profile) redirect("/onboarding");
    logs = await getDemoExerciseLogs();
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("age_years")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      const setupIssue = getDatabaseSetupIssue(profileError);
      if (setupIssue) return <DatabaseSetupNotice active="exercise" issue={setupIssue} />;
      throw new Error(`Could not load your profile: ${profileError.message}`);
    }
    if (!profile?.age_years) redirect("/onboarding");

    const { data, error } = await supabase.from("exercise_logs")
      .select("id,entry_date,exercise,repetitions,created_at")
      .eq("user_id", user.id)
      .eq("entry_date", day)
      .order("created_at", { ascending: false });
    if (error) {
      const setupIssue = getDatabaseSetupIssue(error);
      if (setupIssue) return <DatabaseSetupNotice active="exercise" issue={setupIssue} />;
      throw new Error(`Could not load your exercise logs: ${error.message}`);
    }
    logs = (data ?? []) as ExerciseLog[];
  }

  const dayLogs = logs.filter((log) => log.entry_date === day);
  const pushUpTotal = dayLogs.reduce((sum, log) => sum + Number(log.repetitions), 0);
  const previous = shiftDay(day, -1);
  const next = shiftDay(day, 1);
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${day}T12:00:00+05:30`));

  return (
    <AppShell active="exercise">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="fit-eyebrow">Move at your own pace</p>
          <h1 className="fit-heading">Exercise</h1>
          <p className="mt-2 text-sm text-[#7b8077]">{dateLabel}</p>
        </div>
        <div className="mb-1 flex shrink-0 items-center gap-2">
          <a aria-label="Previous day" href={`/exercise?day=${previous}`} className="grid size-10 place-items-center rounded-full border border-[#e6e3da] bg-[#fffefa] text-xl text-[#62685f] transition-colors hover:bg-[#eeeee5]">‹</a>
          {day < today
            ? <a aria-label="Next day" href={`/exercise?day=${next}`} className="grid size-10 place-items-center rounded-full border border-[#e6e3da] bg-[#fffefa] text-xl text-[#62685f] transition-colors hover:bg-[#eeeee5]">›</a>
            : <span className="grid size-10 place-items-center rounded-full text-xl text-[#c7ccc4]" aria-hidden="true">›</span>}
        </div>
      </header>

      {params.exerciseSaved && <p role="status" className="mb-4 rounded-xl bg-[#edf5e9] p-3 text-sm text-[#335c2c]">Exercise log updated.</p>}
      {params.exerciseError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.exerciseError.replaceAll("+", " ")}</p>}

      <section className="fit-card" aria-labelledby="push-up-title">
        <p className="fit-eyebrow">Strength · bodyweight</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="push-up-title" className="text-2xl">Push-ups</h2>
            <p className="mt-1 text-sm leading-6 text-[#7b8077]">Log a set whenever you like. Counts are private to your account.</p>
          </div>
          <p className="text-right">
            <span className="block text-3xl font-semibold tabular-nums">{pushUpTotal.toLocaleString("en-US")}</span>
            <span className="text-xs text-[#7b8077]">reps today</span>
          </p>
        </div>
        <p data-draft-status className="mt-4 text-xs text-[#7b8077]">An unfinished set is saved only in this browser tab.</p>
        <form action="/api/exercise-logs" method="post" data-draft-key={`exercise-set:${day}`} className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <input type="hidden" name="entry_date" value={day} />
          <label className="block text-sm font-medium text-[#62685f]">Repetitions
            <input className="fit-input mt-1.5" name="repetitions" type="number" required min="1" max="10000" step="1" inputMode="numeric" placeholder="e.g. 10" />
          </label>
          <button data-pending-label="Logging…" className="fit-button-primary w-full sm:w-auto sm:min-w-36">Log push-ups</button>
        </form>

        {dayLogs.length > 0 ? (
          <ul className="mt-4 divide-y divide-[#efede7] border-t border-[#efede7]">
            {dayLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 py-3">
                <span className="text-sm text-[#62685f]">
                  <time dateTime={log.created_at}>{new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(log.created_at))}</time>
                  <span className="text-[#7b8077]"> · set</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">{Number(log.repetitions).toLocaleString("en-US")} reps</span>
                  <form action="/api/exercise-logs" method="post">
                    <input type="hidden" name="action" value="delete" />
                    <input type="hidden" name="entry_date" value={day} />
                    <input type="hidden" name="id" value={log.id} />
                    <button aria-label={`Delete ${log.repetitions} push-up log`} data-pending-label="Removing…" className="rounded-md px-2 py-1 text-xs text-red-700 hover:bg-red-50">Remove</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg bg-[#faf9f5] p-4 text-sm leading-6 text-[#62685f]">No exercise logged for this day yet. Start wherever you are.</p>
        )}
      </section>
      <p className="mt-5 text-center text-xs leading-5 text-[#7b8077]">Your activity log is personal. Rest days are part of a healthy routine.</p>
    </AppShell>
  );
}
