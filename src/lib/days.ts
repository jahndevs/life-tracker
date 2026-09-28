import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { currentStreak, scoreDay, type DayScore } from "@/lib/adherence";
import { addDays, diffDays, todayIn, weekday, type ISODate } from "@/lib/dates";
import { db } from "@/lib/db";

const dayInclude = {
  nutrition: true,
  supplements: {
    include: { supplement: { select: { name: true, timing: true, sortOrder: true } } },
    orderBy: { supplement: { sortOrder: "asc" } },
  },
  workouts: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.DayLogInclude;

export type FullDay = Prisma.DayLogGetPayload<{ include: typeof dayInclude }>;

// A day is created from the plan the first time it's opened. Later plan
// edits don't touch it, except new supplements when syncSupplements is set.
export async function ensureDay(
  userId: string,
  date: ISODate,
  { syncSupplements = false } = {},
): Promise<FullDay> {
  const existing = await db.dayLog.findUnique({
    where: { userId_date: { userId, date } },
    include: dayInclude,
  });

  if (existing) {
    if (!syncSupplements) return existing;
    const missing = await db.supplement.findMany({
      where: { userId, active: true, logs: { none: { dayLogId: existing.id } } },
      select: { id: true },
    });
    if (missing.length === 0) return existing;
    await db.supplementLog.createMany({
      data: missing.map((s) => ({ dayLogId: existing.id, supplementId: s.id })),
    });
    return db.dayLog.findUniqueOrThrow({ where: { id: existing.id }, include: dayInclude });
  }

  const [supplements, templates] = await Promise.all([
    db.supplement.findMany({ where: { userId, active: true }, select: { id: true } }),
    db.workoutTemplate.findMany({
      where: { userId, weekday: weekday(date) },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  try {
    return await db.dayLog.create({
      data: {
        userId,
        date,
        nutrition: { create: {} },
        supplements: { create: supplements.map((s) => ({ supplementId: s.id })) },
        workouts: {
          create: templates.map((t, i) => ({
            templateId: t.id,
            type: t.type,
            protocol: t.protocol,
            hardLong: t.hardLong,
            sortOrder: i,
          })),
        },
      },
      include: dayInclude,
    });
  } catch (e) {
    // Created concurrently by another request.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return db.dayLog.findUniqueOrThrow({
        where: { userId_date: { userId, date } },
        include: dayInclude,
      });
    }
    throw e;
  }
}

const EMPTY_DAY = { nutrition: null, supplements: [], workouts: [] };

// Days never opened score zero, so skipped days still count.
async function scoreRange(
  userId: string,
  from: ISODate,
  to: ISODate,
): Promise<{ date: ISODate; score: DayScore }[]> {
  if (diffDays(from, to) < 0) return [];
  const days = await db.dayLog.findMany({
    where: { userId, date: { gte: from, lte: to } },
    select: {
      date: true,
      nutrition: {
        select: { hitCalories: true, hitProtein: true, hitCarbs: true, hitFat: true, hitWater: true },
      },
      supplements: { select: { taken: true } },
      workouts: { select: { completed: true } },
    },
  });
  const byDate = new Map(days.map((d) => [d.date, d]));
  return Array.from({ length: diffDays(from, to) + 1 }, (_, i) => {
    const date = addDays(from, i);
    return { date, score: scoreDay(byDate.get(date) ?? EMPTY_DAY) };
  });
}

export function trackingStart(user: { timezone: string; createdAt: Date }): ISODate {
  return todayIn(user.timezone, user.createdAt);
}

export async function getStreak(
  user: { id: string; timezone: string; createdAt: Date },
  today: ISODate,
): Promise<number> {
  const start = trackingStart(user);
  const yearAgo = addDays(today, -365);
  const from = diffDays(start, yearAgo) > 0 ? yearAgo : start;
  const range = await scoreRange(user.id, from, today);
  return currentStreak(range.map((r) => r.score));
}

export function latestWeighIn(userId: string, onOrBefore: ISODate) {
  return db.dayLog.findFirst({
    where: { userId, date: { lte: onOrBefore }, weight: { not: null } },
    orderBy: { date: "desc" },
    select: { date: true, weight: true },
  });
}
