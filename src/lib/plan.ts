import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { MacroKey } from "@/lib/adherence";
import type { ISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { PHASE_KEYS, targetPhaseKey, type PhaseKey } from "@/lib/phases";

export type MacroTargets = Record<MacroKey, number>;

export const getPlan = cache(async (userId: string) => {
  const [plan, targets] = await Promise.all([
    db.plan.findUnique({ where: { userId } }),
    db.phaseTarget.findMany({ where: { userId } }),
  ]);
  if (!plan) return null;

  const byPhase = Object.fromEntries(
    PHASE_KEYS.map((key) => {
      const t = targets.find((row) => row.phase === key);
      return [
        key,
        t ? { calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat, waterOz: t.waterOz } : null,
      ];
    }),
  ) as Record<PhaseKey, MacroTargets | null>;

  return { ...plan, targets: byPhase };
});

// Pages call this themselves: layouts render in parallel with pages, so a
// redirect in the layout doesn't stop the page from running.
export async function requirePlan(userId: string) {
  const plan = await getPlan(userId);
  if (!plan) redirect("/onboarding");
  return plan;
}

export type LoadedPlan = NonNullable<Awaited<ReturnType<typeof getPlan>>>;

export function targetsOn(plan: LoadedPlan, date: ISODate): MacroTargets | null {
  return plan.targets[targetPhaseKey(plan, date)];
}
