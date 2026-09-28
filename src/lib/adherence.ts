export const MACRO_KEYS = ["calories", "protein", "carbs", "fat", "waterOz"] as const;
export type MacroKey = (typeof MACRO_KEYS)[number];

export type HitField = "hitCalories" | "hitProtein" | "hitCarbs" | "hitFat" | "hitWater";

export const MACROS: Record<
  MacroKey,
  { label: string; unit: string; hitField: HitField; rule: string }
> = {
  calories: { label: "Calories", unit: "kcal", hitField: "hitCalories", rule: "within ±10% of target" },
  protein: { label: "Protein", unit: "g", hitField: "hitProtein", rule: "at least 95% of target" },
  carbs: { label: "Carbs", unit: "g", hitField: "hitCarbs", rule: "within ±15% of target" },
  fat: { label: "Fat", unit: "g", hitField: "hitFat", rule: "within ±15% of target" },
  waterOz: { label: "Water", unit: "oz", hitField: "hitWater", rule: "at least the target" },
};

export function isMacroHit(key: MacroKey, actual: number, target: number): boolean {
  if (target <= 0) return actual > 0;
  const r = actual / target;
  switch (key) {
    case "calories":
      return r >= 0.9 && r <= 1.1;
    case "protein":
      return r >= 0.95;
    case "carbs":
    case "fat":
      return r >= 0.85 && r <= 1.15;
    case "waterOz":
      return r >= 1;
  }
}

export type Tally = { done: number; total: number };

export type DayShape = {
  nutrition: Record<HitField, boolean> | null;
  supplements: { taken: boolean }[];
  workouts: { completed: boolean }[];
};

export type DayScore = {
  nutrition: Tally;
  supplements: Tally;
  workouts: Tally;
  overall: Tally;
};

export function scoreDay(day: DayShape): DayScore {
  const nutrition: Tally = {
    done: day.nutrition
      ? MACRO_KEYS.filter((k) => day.nutrition![MACROS[k].hitField]).length
      : 0,
    total: MACRO_KEYS.length,
  };
  const supplements = tally(day.supplements.map((s) => s.taken));
  const workouts = tally(day.workouts.map((w) => w.completed));
  return {
    nutrition,
    supplements,
    workouts,
    overall: sum([nutrition, supplements, workouts]),
  };
}

export function tally(flags: boolean[]): Tally {
  return { done: flags.filter(Boolean).length, total: flags.length };
}

export function sum(tallies: Tally[]): Tally {
  return tallies.reduce((a, t) => ({ done: a.done + t.done, total: a.total + t.total }), {
    done: 0,
    total: 0,
  });
}

/** 0–100, or null when there was nothing to do. */
export function pct(t: Tally): number | null {
  return t.total === 0 ? null : Math.round((t.done / t.total) * 100);
}

export const STREAK_THRESHOLD = 80;

// `days` must be contiguous, ascending, and end with today. An unfinished
// today doesn't break the streak.
export function currentStreak(days: { overall: Tally }[], threshold = STREAK_THRESHOLD): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const p = pct(days[i].overall);
    const qualifies = p !== null && p >= threshold;
    if (qualifies) streak++;
    else if (i === days.length - 1) continue; // today, still in progress
    else break;
  }
  return streak;
}

export function longestStreak(days: { overall: Tally }[], threshold = STREAK_THRESHOLD): number {
  let best = 0;
  let run = 0;
  for (const day of days) {
    const p = pct(day.overall);
    run = p !== null && p >= threshold ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
