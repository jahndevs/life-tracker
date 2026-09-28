"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { diffDays, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { ALL_DAYS } from "@/lib/habits";
import { HabitSchema, isoDate } from "@/lib/validation";
import type { ActionResult } from "@/app/actions/tracking";

function refresh() {
  revalidatePath("/", "layout");
}

export type HabitInput = { name: string; cadence: string; days: number };

function parse(input: HabitInput) {
  return HabitSchema.safeParse({
    ...input,
    days: input.cadence === "custom" ? input.days : ALL_DAYS,
  });
}

export async function createHabit(input: HabitInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = parse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const count = await db.habit.count({ where: { userId: user.id } });
  await db.habit.create({
    data: {
      userId: user.id,
      ...parsed.data,
      startDate: todayIn(user.timezone),
      sortOrder: count,
    },
  });
  refresh();
  return { ok: true };
}

export async function updateHabit(id: string, input: HabitInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = parse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await db.habit.updateMany({ where: { id, userId: user.id }, data: parsed.data });
  refresh();
  return { ok: true };
}

export async function setHabitArchived(id: string, archived: boolean) {
  const user = await requireUser();
  await db.habit.updateMany({ where: { id, userId: user.id }, data: { archived } });
  refresh();
}

export async function deleteHabit(id: string) {
  const user = await requireUser();
  await db.habit.deleteMany({ where: { id, userId: user.id } });
  refresh();
}

export async function setHabitDone(habitId: string, date: string, done: boolean) {
  const user = await requireUser();
  const day = isoDate.parse(date);
  if (diffDays(day, todayIn(user.timezone)) < 0) return;
  const habit = await db.habit.findFirst({ where: { id: habitId, userId: user.id } });
  if (!habit) return;

  if (done) {
    await db.habitLog.upsert({
      where: { habitId_date: { habitId, date: day } },
      create: { habitId, date: day },
      update: {},
    });
    // Backfilling a day before the start date moves the start back.
    if (diffDays(day, habit.startDate) > 0) {
      await db.habit.update({ where: { id: habitId }, data: { startDate: day } });
    }
  } else {
    await db.habitLog.deleteMany({ where: { habitId, date: day } });
  }
  refresh();
}
