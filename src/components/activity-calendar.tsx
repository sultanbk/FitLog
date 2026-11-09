import Link from "next/link";
import { calendarDays, shiftMonth } from "@/lib/progress-analytics";

type Props = {
  month: string;
  today: string;
  nutritionDays: Set<string>;
  weightDays: Set<string>;
  exerciseDays: Set<string>;
  period: string;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ActivityCalendar({ month, today, nutritionDays, weightDays, exerciseDays, period }: Props) {
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  const monthDate = new Date(`${month}-01T12:00:00Z`);
  const title = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthDate);
  const days = calendarDays(month);
  const nextHref = `/progress?period=${period}&month=${nextMonth}`;
  const previousHref = `/progress?period=${period}&month=${previousMonth}`;

  return (
    <section className="fit-card" aria-labelledby="calendar-title">
      <div className="flex items-center justify-between gap-3">
        <div><p className="fit-eyebrow">Your month</p><h2 id="calendar-title" className="mt-2 text-2xl">Activity calendar</h2></div>
        <div className="flex items-center gap-2">
          <Link href={previousHref} aria-label="Previous month" className="grid size-10 place-items-center rounded-full border border-[#e6e3da] text-lg text-[#62685f] hover:bg-[#eeeee5]">‹</Link>
          {nextMonth <= today.slice(0, 7)
            ? <Link href={nextHref} aria-label="Next month" className="grid size-10 place-items-center rounded-full border border-[#e6e3da] text-lg text-[#62685f] hover:bg-[#eeeee5]">›</Link>
            : <span aria-hidden="true" className="grid size-10 place-items-center rounded-full text-lg text-[#c7ccc4]">›</span>}
        </div>
      </div>
      <p className="mt-4 text-center text-sm font-semibold text-[#62685f]">{title}</p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {weekdays.map((day) => <span key={day} className="py-2 text-xs font-medium text-[#7b8077]">{day}</span>)}
        {days.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} aria-hidden="true" />;
          const canOpen = day <= today;
          const isToday = day === today;
          const markers = [
            nutritionDays.has(day) ? ["Food logged", "#71856a"] : null,
            weightDays.has(day) ? ["Weight logged", "#b68757"] : null,
            exerciseDays.has(day) ? ["Push-ups logged", "#7488a0"] : null,
          ].filter((marker): marker is [string, string] => marker !== null);
          const contents = <>
            <span>{Number(day.slice(-2))}</span>
            <span aria-hidden="true" className="mt-1 flex h-1 justify-center gap-0.5">
              {markers.map(([label, color]) => <span key={label} className="size-1 rounded-full" style={{ backgroundColor: color }} />)}
            </span>
          </>;
          const className = `flex min-h-12 flex-col items-center justify-center rounded-lg px-1 py-1 text-xs transition-colors ${isToday ? "bg-[#35483a] font-semibold text-white" : canOpen ? "text-[#454c42] hover:bg-[#eeeee5]" : "text-[#c7ccc4]"}`;
          return canOpen
            ? <Link key={day} href={`/today?day=${day}`} aria-label={`${day}${markers.length ? `, ${markers.map(([label]) => label).join(", ")}` : ", no entries"}`} aria-current={isToday ? "date" : undefined} className={className}>{contents}</Link>
            : <span key={day} aria-disabled="true" className={className}>{contents}</span>;
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#efede7] pt-4 text-xs text-[#62685f]">
        <Legend color="#71856a" label="Food" /><Legend color="#b68757" label="Weight" /><Legend color="#7488a0" label="Push-ups" />
      </div>
      <p className="mt-3 text-xs leading-5 text-[#7b8077]">Select a past or current day to open that day’s journal.</p>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>;
}
