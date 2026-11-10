import { addDays, isValidDay } from "./progress-analytics.ts";

export const WEEKLY_CHECK_IN_TARGET = 3;

export type WeeklyCheckIn = {
  weekStart: string;
  weekEnd: string;
  daysThisWeek: number;
  completedWeekStreak: number;
  streakIsAtLeast: boolean;
};

export function getMonday(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

export function calculateWeeklyCheckIn(
  today: string,
  loggedDays: readonly string[],
  coverageStart: string,
): WeeklyCheckIn {
  const weekStart = getMonday(today);
  const weekEnd = addDays(weekStart, 6);
  const validDays = new Set(loggedDays.filter((day) => isValidDay(day) && day <= today));
  const daysThisWeek = [...validDays].filter((day) => day >= weekStart && day <= weekEnd).length;
  const firstCoveredWeek = getMonday(coverageStart);
  let completedWeekStart = addDays(weekStart, -7);
  let completedWeekStreak = 0;

  while (completedWeekStart >= firstCoveredWeek) {
    const completedWeekEnd = addDays(completedWeekStart, 6);
    const daysInWeek = [...validDays].filter((day) => day >= completedWeekStart && day <= completedWeekEnd).length;
    if (daysInWeek < WEEKLY_CHECK_IN_TARGET) {
      return { weekStart, weekEnd, daysThisWeek, completedWeekStreak, streakIsAtLeast: false };
    }
    completedWeekStreak += 1;
    completedWeekStart = addDays(completedWeekStart, -7);
  }

  return {
    weekStart,
    weekEnd,
    daysThisWeek,
    completedWeekStreak,
    streakIsAtLeast: completedWeekStreak > 0,
  };
}
