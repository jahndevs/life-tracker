"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PlanSchema, SupplementSchema, TargetsSchema, WorkoutSchema } from "@/lib/validation";
import type { ActionResult } from "@/app/actions/tracking";

export type PlanFormState =
  | { ok?: boolean; errors?: Partial<Record<string, string[]>>; message?: string }
  | undefined;

function refresh() {
  revalidatePath("/", "layout");
}

export async function completeOnboarding(_: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const user = await requireUser();
  const parsed = PlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  if (!(await db.plan.findUnique({ where: { userId: user.id } }))) {
    await db.plan.create({ data: { userId: user.id, ...parsed.data } });
  }
  redirect("/plan");
}

export async function savePlan(_: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const user = await requireUser();
  const parsed = PlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  await db.plan.update({ where: { userId: user.id }, data: parsed.data });
  refresh();
  return { ok: true };
}

export async function saveTargets(input: Record<string, string>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = TargetsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Fill in all five targets as whole numbers." };

  const { phase, ...targets } = parsed.data;
  await db.phaseTarget.upsert({
    where: { userId_phase: { userId: user.id, phase } },
    create: { userId: user.id, phase, ...targets },
    update: targets,
  });
  refresh();
  return { ok: true };
}

export async function addSupplement(input: { name: string; timing: string }): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = SupplementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Give the supplement a name." };

  const last = await db.supplement.findFirst({
    where: { userId: user.id },
    orderBy: { sortOrder: "desc" },
  });
  await db.supplement.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      timing: parsed.data.timing || null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  refresh();
  return { ok: true };
}

export async function setSupplementActive(id: string, active: boolean) {
  const user = await requireUser();
  await db.supplement.updateMany({ where: { id, userId: user.id }, data: { active } });
  refresh();
}

export async function addWorkoutTemplate(input: {
  weekday: number;
  type: string;
  protocol: string;
  hardLong: boolean;
}): Promise<ActionResult> {
  const user = await requireUser();
  const weekday = z.number().int().min(0).max(6).safeParse(input.weekday);
  const parsed = WorkoutSchema.safeParse(input);
  if (!weekday.success || !parsed.success) return { ok: false, error: "Describe the session." };

  const count = await db.workoutTemplate.count({ where: { userId: user.id, weekday: weekday.data } });
  await db.workoutTemplate.create({
    data: { userId: user.id, weekday: weekday.data, ...parsed.data, sortOrder: count },
  });
  refresh();
  return { ok: true };
}

export async function updateWorkoutTemplate(
  id: string,
  input: { type: string; protocol: string; hardLong: boolean },
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = WorkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Describe the session." };
  await db.workoutTemplate.updateMany({ where: { id, userId: user.id }, data: parsed.data });
  refresh();
  return { ok: true };
}

export async function deleteWorkoutTemplate(id: string) {
  const user = await requireUser();
  await db.workoutTemplate.deleteMany({ where: { id, userId: user.id } });
  refresh();
}
