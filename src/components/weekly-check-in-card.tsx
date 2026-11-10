import { WEEKLY_CHECK_IN_TARGET, type WeeklyCheckIn } from "@/lib/weekly-check-in";

export function WeeklyCheckInCard({ progress, detailed = false }: { progress: WeeklyCheckIn; detailed?: boolean }) {
  const daysRemaining = Math.max(0, WEEKLY_CHECK_IN_TARGET - progress.daysThisWeek);
  const streakLabel = progress.completedWeekStreak === 1 ? "week" : "weeks";
  const dateLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  const weekLabel = `${dateLabel.format(new Date(`${progress.weekStart}T12:00:00Z`))}–${dateLabel.format(new Date(`${progress.weekEnd}T12:00:00Z`))}`;

  return (
    <section className={`fit-card ${detailed ? "mt-5" : "mt-4"}`} aria-labelledby={`weekly-check-in-title-${detailed ? "detail" : "today"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="fit-eyebrow">{detailed ? "Consistency, gently" : "A gentle rhythm"}</p>
          <h2 id={`weekly-check-in-title-${detailed ? "detail" : "today"}`} className="mt-2 text-xl">
            {progress.completedWeekStreak > 0
              ? `${progress.completedWeekStreak}${progress.streakIsAtLeast ? "+" : ""}-week streak`
              : "Build your check-in rhythm"}
          </h2>
          <p className="mt-1 text-xs text-[#7b8077]">Week of {weekLabel}</p>
        </div>
        <span className="rounded-full bg-[#edf5e9] px-3 py-1.5 text-sm font-semibold tabular-nums text-[#315c35]">
          {progress.daysThisWeek}/{WEEKLY_CHECK_IN_TARGET} days this week
        </span>
      </div>
      <div className="fit-progress-track mt-4" role="progressbar" aria-label="Weekly check-in days" aria-valuemin={0} aria-valuemax={WEEKLY_CHECK_IN_TARGET} aria-valuenow={Math.min(progress.daysThisWeek, WEEKLY_CHECK_IN_TARGET)}>
        <div className="fit-progress-fill" style={{ width: `${Math.min(100, (progress.daysThisWeek / WEEKLY_CHECK_IN_TARGET) * 100)}%` }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-[#62685f]">
        {daysRemaining > 0
          ? `${daysRemaining} more ${daysRemaining === 1 ? "day" : "days"} with a food or exercise log to reach this week’s goal.`
          : "You’ve reached this week’s check-in goal. Any more logging is optional."}
      </p>
      {progress.completedWeekStreak > 0 && (
        <p className="mt-1 text-xs leading-5 text-[#7b8077]">
          {progress.streakIsAtLeast ? "At least " : ""}{progress.completedWeekStreak} completed {streakLabel} met the goal. This week is tracked separately until Sunday.
        </p>
      )}
      {detailed && (
        <p className="mt-2 text-xs leading-5 text-[#7b8077]">
          Weeks run Monday–Sunday. Any day with a saved food or exercise log counts once; weigh-ins and calorie targets don’t count. This is about showing up, not perfection.
        </p>
      )}
    </section>
  );
}
