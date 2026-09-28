"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { isMacroHit, MACROS, type HitField } from "@/lib/adherence";
import { requireUser } from "@/lib/auth/session";
import { ensureDay } from "@/lib/days";
import { db } from "@/lib/db";
import { getPlan, targetsOn } from "@/lib/plan";
import {
  isoDate,
  MacroKeySchema,
  WeighInSchema,
  WorkoutDetailsSchema,
  WorkoutSchema,
} from "@/lib/validation";

// Every write is scoped by the signed-in user's id.

export type ActionResult = { ok: true } | { ok: false; error: string };

const HIT_FIELDS = ["hitCalories", "hitProtein", "hitCarbs", "hitFat", "hitWater"] as const;

function refresh() {
  revalidatePath("/", "layout");
}

export async function setNutritionHit(dayLogId: string, field: HitField, hit: boolean) {
  const user = await requireUser();
  z.enum(HIT_FIELDS).parse(field);
  await db.nutritionLog.updateMany({
    where: { dayLogId, dayLog: { userId: user.id } },
    data: { [field]: hit },
  });
  refresh();
}

export async function setNutritionAmount(
  dayLogId: string,
  macro: string,
  raw: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const key = MacroKeySchema.parse(macro);
  const amount = raw.trim() === "" ? null : Number(raw);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 20000)) {
    return { ok: false, error: "Enter a number." };
  }

  const day = await db.dayLog.findFirst({ where: { id: dayLogId, userId: user.id } });
  const plan = await getPlan(user.id);
  if (!day || !plan) return { ok: false, error: "Day not found." };

  const data: Record<string, number | boolean | null> = {
    [key]: amount === null ? null : Math.round(amount),
  };
  const targets = targetsOn(plan, day.date);
  if (amount !== null && targets) {
    data[MACROS[key].hitField] = isMacroHit(key, amount, targets[key]);
  }

  await db.nutritionLog.upsert({
    where: { dayLogId },
    create: { dayLogId, ...data },
    update: data,
  });
  refresh();
  return { ok: true };
}

export async function setSupplementTaken(logId: string, taken: boolean) {
  const user = await requireUser();
  await db.supplementLog.updateMany({
    where: { id: logId, dayLog: { userId: user.id } },
    data: { taken },
  });
  refresh();
}

export async function setSupplementTakenOn(date: string, supplementId: string, taken: boolean) {
  const user = await requireUser();
  const day = await ensureDay(user.id, isoDate.parse(date));
  const supplement = await db.supplement.findFirst({ where: { id: supplementId, userId: user.id } });
  if (!supplement) return;
  await db.supplementLog.upsert({
    where: { dayLogId_supplementId: { dayLogId: day.id, supplementId } },
    create: { dayLogId: day.id, supplementId, taken },
    update: { taken },
  });
  refresh();
}

export async function setWorkoutCompleted(logId: string, completed: boolean) {
  const user = await requireUser();
  await db.workoutLog.updateMany({
    where: { id: logId, dayLog: { userId: user.id } },
    data: { completed },
  });
  refresh();
}

export async function saveWorkoutDetails(
  logId: string,
  input: { distance: string; duration: string; notes: string },
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = WorkoutDetailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check distance and duration." };
  await db.workoutLog.updateMany({
    where: { id: logId, dayLog: { userId: user.id } },
    data: {
      distance: parsed.data.distance ?? null,
      duration: parsed.data.duration ?? null,
      notes: parsed.data.notes || null,
    },
  });
  refresh();
  return { ok: true };
}

export async function addWorkout(
  date: string,
  input: { type: string; protocol: string; hardLong: boolean },
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = WorkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: z.prettifyError(parsed.error) };

  const day = await ensureDay(user.id, isoDate.parse(date));
  await db.workoutLog.create({
    data: { dayLogId: day.id, ...parsed.data, sortOrder: day.workouts.length },
  });
  refresh();
  return { ok: true };
}

export async function deleteWorkout(logId: string) {
  const user = await requireUser();
  await db.workoutLog.deleteMany({ where: { id: logId, dayLog: { userId: user.id } } });
  refresh();
}

export type WeighInState = { ok?: boolean; error?: string } | undefined;

export async function saveWeighIn(_: WeighInState, formData: FormData): Promise<WeighInState> {
  const user = await requireUser();
  const parsed = WeighInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the numbers and try again." };

  const { date, ...fields } = parsed.data;
  if (Object.values(fields).every((v) => v === undefined)) {
    return { error: "Enter a weight or at least one measurement." };
  }

  const day = await ensureDay(user.id, date);
  // Only overwrite fields that were filled in.
  const data = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  await db.dayLog.update({ where: { id: day.id }, data });
  refresh();
  return { ok: true };
}

export async function clearWeighIn(dayLogId: string) {
  const user = await requireUser();
  await db.dayLog.updateMany({
    where: { id: dayLogId, userId: user.id },
    data: {
      weight: null,
      waistNavel: null,
      waistNatural: null,
      chest: null,
      arm: null,
      thigh: null,
      hips: null,
    },
  });
  refresh();
}
