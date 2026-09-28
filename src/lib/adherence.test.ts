import { describe, expect, it } from "vitest";
import { currentStreak, isMacroHit, pct, scoreDay, type Tally } from "@/lib/adherence";
import { addDays, startOfWeek, todayIn, weekday } from "@/lib/dates";

describe("macro hit rules", () => {
  it("grades calories within ±10%", () => {
    expect(isMacroHit("calories", 2300, 2300)).toBe(true);
    expect(isMacroHit("calories", 2530, 2300)).toBe(true);
    expect(isMacroHit("calories", 2600, 2300)).toBe(false);
    expect(isMacroHit("calories", 1900, 2300)).toBe(false);
  });

  it("treats protein and water as floors", () => {
    expect(isMacroHit("protein", 200, 210)).toBe(true);
    expect(isMacroHit("protein", 190, 210)).toBe(false);
    expect(isMacroHit("protein", 300, 210)).toBe(true);
    expect(isMacroHit("waterOz", 119, 120)).toBe(false);
  });
});

describe("scoring", () => {
  it("scores a day across all three areas", () => {
    const score = scoreDay({
      nutrition: { hitCalories: true, hitProtein: true, hitCarbs: false, hitFat: false, hitWater: true },
      supplements: [{ taken: true }, { taken: false }],
      workouts: [{ completed: true }],
    });
    expect(score.nutrition).toEqual({ done: 3, total: 5 });
    expect(score.overall).toEqual({ done: 5, total: 8 });
    expect(pct(score.overall)).toBe(63);
  });

  it("counts an unopened day as zero, not empty", () => {
    const score = scoreDay({ nutrition: null, supplements: [], workouts: [] });
    expect(pct(score.overall)).toBe(0);
  });
});

describe("streak", () => {
  const day = (p: number): { overall: Tally } => ({ overall: { done: p, total: 100 } });

  it("counts trailing qualifying days", () => {
    expect(currentStreak([day(90), day(50), day(85), day(100), day(80)])).toBe(3);
  });

  it("doesn't break on an unfinished today", () => {
    expect(currentStreak([day(90), day(90), day(10)])).toBe(2);
  });

  it("breaks on a missed yesterday", () => {
    expect(currentStreak([day(90), day(10), day(10)])).toBe(0);
  });
});

describe("dates", () => {
  it("does calendar math without timezone drift", () => {
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09"); // across US DST
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekday("2026-09-28")).toBe(0);
    expect(startOfWeek("2026-10-04")).toBe("2026-09-28");
  });

  it("computes today in the user's timezone", () => {
    const instant = new Date("2026-09-28T02:30:00Z");
    expect(todayIn("America/New_York", instant)).toBe("2026-09-27");
    expect(todayIn("Europe/London", instant)).toBe("2026-09-28");
  });
});
