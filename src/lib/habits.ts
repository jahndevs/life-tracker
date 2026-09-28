import { currentStreak, longestStreak, tally, type Tally } from "@/lib/adherence";
import { addDays, diffDays, WEEKDAY_LABELS, weekday, type ISODate } from "@/lib/dates";

export const ALL_DAYS = 0b1111111;

export type HabitSchedule = { cadence: string; days: number; startDate: ISODate };

export function isScheduled(habit: HabitSchedule, date: ISODate): boolean {
  if (diffDays(habit.startDate, date) < 0) return false;
  const day = weekday(date);
  switch (habit.cadence) {
    case "weekdays":
      return day < 5;
    case "custom":
      return ((habit.days >> day) & 1) === 1;
    default:
      return true;
  }
}

export function cadenceLabel(habit: Pick<HabitSchedule, "cadence" | "days">): string {
  if (habit.cadence === "daily") return "Every day";
  if (habit.cadence === "weekdays") return "Weekdays";
  if (habit.days === ALL_DAYS) return "Every day";
  return WEEKDAY_LABELS.filter((_, i) => (habit.days >> i) & 1).join(", ") || "No days";
}

export type HabitStats = {
  streak: number;
  best: number;
  last30: Tally;
};

// Only scheduled days count, so a Mon/Wed/Fri habit isn't broken by Tuesday.
export function habitStats(habit: HabitSchedule, done: Set<ISODate>, today: ISODate): HabitStats {
  const scheduled: { date: ISODate; overall: Tally }[] = [];
  for (let date = habit.startDate; diffDays(date, today) >= 0; date = addDays(date, 1)) {
    if (isScheduled(habit, date)) scheduled.push({ date, overall: tally([done.has(date)]) });
  }
  const monthAgo = addDays(today, -29);
  return {
    streak: currentStreakEndingToday(scheduled, today),
    best: longestStreak(scheduled, 100),
    last30: tally(scheduled.filter((d) => diffDays(monthAgo, d.date) >= 0).map((d) => d.overall.done > 0)),
  };
}

function currentStreakEndingToday(days: { date: ISODate; overall: Tally }[], today: ISODate) {
  // currentStreak only forgives the last entry, which must be today.
  const last = days.at(-1);
  if (last && last.date !== today) days = [...days, { date: today, overall: { done: 0, total: 0 } }];
  return currentStreak(days, 100);
}
