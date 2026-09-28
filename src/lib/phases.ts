import { addDays, diffDays, type ISODate } from "@/lib/dates";

export const PHASE_KEYS = ["base", "volume", "race", "taper"] as const;
export type PhaseKey = (typeof PHASE_KEYS)[number];

const TAPER_WEEKS = 2;
const RACE_SPECIFIC_WEEKS = 8;

export const PHASE_INFO: Record<PhaseKey, { name: string; focus: string }> = {
  base: {
    name: "Base / Cut",
    focus:
      "Aerobic base at conversational pace, lift 3×/week, hold the deficit. Protein high to keep muscle while the scale moves.",
  },
  volume: {
    name: "Volume",
    focus:
      "Build weekly hours: longer rides and runs, first bricks. Eat near maintenance and fuel the long sessions.",
  },
  race: {
    name: "Race-Specific",
    focus:
      "Race-pace intervals, long bricks, open-water swims. Rehearse race-day nutrition on every long session.",
  },
  taper: {
    name: "Taper",
    focus: "Cut volume 40–60%, keep some intensity. Carb up the final two days. Sleep.",
  },
};

export type PlanNumbers = {
  startDate: ISODate;
  startWeight: number;
  goalWeight: number;
  weeklyLossLb: number;
  raceDate: ISODate;
};

export type Phase = {
  key: PhaseKey;
  name: string;
  focus: string;
  start: ISODate;
  end: ISODate; // inclusive
  weeks: number;
};

export function cutWeeks(plan: PlanNumbers): number {
  if (plan.weeklyLossLb <= 0 || plan.startWeight <= plan.goalWeight) return 0;
  return Math.ceil((plan.startWeight - plan.goalWeight) / plan.weeklyLossLb - 1e-9);
}

export function cutEndDate(plan: PlanNumbers): ISODate {
  return addDays(plan.startDate, cutWeeks(plan) * 7);
}

export function buildPhases(plan: PlanNumbers): Phase[] {
  const taperStart = addDays(plan.raceDate, -(TAPER_WEEKS * 7 - 1));
  const raceStart = addDays(taperStart, -RACE_SPECIFIC_WEEKS * 7);
  const cutEnd = cutEndDate(plan);

  // If the cut runs into race-specific work, race prep wins.
  const baseEnd = addDays(minDate(cutEnd, raceStart), -1);
  const volumeStart = minDate(cutEnd, raceStart);

  const ranges: [PhaseKey, ISODate, ISODate][] = [
    ["base", plan.startDate, baseEnd],
    ["volume", volumeStart, addDays(raceStart, -1)],
    ["race", maxDate(raceStart, plan.startDate), addDays(taperStart, -1)],
    ["taper", maxDate(taperStart, plan.startDate), plan.raceDate],
  ];

  return ranges
    .filter(([, start, end]) => diffDays(start, end) >= 0)
    .map(([key, start, end]) => ({
      key,
      ...PHASE_INFO[key],
      start,
      end,
      weeks: Math.ceil((diffDays(start, end) + 1) / 7),
    }));
}

export type PhaseStatus =
  | { kind: "before"; daysUntilStart: number; next: Phase }
  | { kind: "active"; phase: Phase; week: number; daysToRace: number }
  | { kind: "after"; daysSinceRace: number };

export function phaseOn(plan: PlanNumbers, date: ISODate): PhaseStatus {
  const phases = buildPhases(plan);
  if (phases.length === 0 || diffDays(date, phases[0].start) > 0) {
    const next = phases[0] ?? { key: "base", ...PHASE_INFO.base, start: plan.startDate, end: plan.raceDate, weeks: 0 };
    return { kind: "before", daysUntilStart: diffDays(date, plan.startDate), next };
  }
  const phase = phases.find((p) => diffDays(p.start, date) >= 0 && diffDays(date, p.end) >= 0);
  if (!phase) return { kind: "after", daysSinceRace: diffDays(plan.raceDate, date) };
  return {
    kind: "active",
    phase,
    week: Math.floor(diffDays(phase.start, date) / 7) + 1,
    daysToRace: diffDays(date, plan.raceDate),
  };
}

export function targetPhaseKey(plan: PlanNumbers, date: ISODate): PhaseKey {
  const status = phaseOn(plan, date);
  if (status.kind === "active") return status.phase.key;
  if (status.kind === "before") return status.next.key;
  return "taper";
}

// Steps down every Monday from the start date and holds at the goal.
export function targetWeightOn(plan: PlanNumbers, date: ISODate): number {
  const weeks = Math.max(0, Math.floor(diffDays(plan.startDate, date) / 7));
  return round1(Math.max(plan.goalWeight, plan.startWeight - plan.weeklyLossLb * weeks));
}

export function targetCurve(plan: PlanNumbers): { date: ISODate; target: number }[] {
  return Array.from({ length: cutWeeks(plan) + 1 }, (_, i) => {
    const date = addDays(plan.startDate, i * 7);
    return { date, target: targetWeightOn(plan, date) };
  });
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function minDate(a: ISODate, b: ISODate) {
  return diffDays(a, b) >= 0 ? a : b;
}

function maxDate(a: ISODate, b: ISODate) {
  return diffDays(a, b) >= 0 ? b : a;
}
