import "server-only";
import { addDays, type ISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { habitStats, isScheduled } from "@/lib/habits";

export async function loadHabits(userId: string, today: ISODate, { archived = false } = {}) {
  const habits = await db.habit.findMany({
    where: { userId, archived },
    include: { logs: { select: { date: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return habits.map((h) => {
    const done = new Set(h.logs.map((l) => l.date));
    return {
      ...h,
      done,
      stats: habitStats(h, done, today),
      scheduledToday: isScheduled(h, today),
    };
  });
}

export type LoadedHabit = Awaited<ReturnType<typeof loadHabits>>[number];

export function consistency(habits: LoadedHabit[], from: ISODate, days: number, today: ISODate) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    if (date > today) return { date, done: 0, total: 0, future: true };
    const scheduled = habits.filter((h) => isScheduled(h, date));
    return {
      date,
      done: scheduled.filter((h) => h.done.has(date)).length,
      total: scheduled.length,
      future: false,
    };
  });
}
