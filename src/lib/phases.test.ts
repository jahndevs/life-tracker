import { describe, expect, it } from "vitest";
import {
  buildPhases,
  cutEndDate,
  cutWeeks,
  phaseOn,
  targetCurve,
  targetPhaseKey,
  targetWeightOn,
  type PlanNumbers,
} from "@/lib/phases";

const plan: PlanNumbers = {
  startDate: "2026-09-28",
  startWeight: 200,
  goalWeight: 179,
  weeklyLossLb: 1.5,
  raceDate: "2027-06-06",
};

describe("target weight curve", () => {
  it("reaches goal on Jan 4 at 1.5 lb/week", () => {
    expect(cutWeeks(plan)).toBe(14);
    expect(cutEndDate(plan)).toBe("2027-01-04");
    expect(targetWeightOn(plan, "2027-01-04")).toBe(179);
  });

  it("steps down on Mondays and holds through the week", () => {
    expect(targetWeightOn(plan, "2026-09-28")).toBe(200);
    expect(targetWeightOn(plan, "2026-10-04")).toBe(200);
    expect(targetWeightOn(plan, "2026-10-05")).toBe(198.5);
  });

  it("holds at goal after the cut and at start before it", () => {
    expect(targetWeightOn(plan, "2027-03-01")).toBe(179);
    expect(targetWeightOn(plan, "2026-09-01")).toBe(200);
  });

  it("has one point per Monday", () => {
    const curve = targetCurve(plan);
    expect(curve).toHaveLength(15);
    expect(curve.at(-1)).toEqual({ date: "2027-01-04", target: 179 });
  });

  it("rounds a partial final week up", () => {
    expect(cutWeeks({ ...plan, goalWeight: 178.5 })).toBe(15);
  });
});

describe("phases", () => {
  const phases = buildPhases(plan);

  it("lays out four contiguous phases ending on race day", () => {
    expect(phases.map((p) => p.key)).toEqual(["base", "volume", "race", "taper"]);
    expect(phases[0].start).toBe("2026-09-28");
    expect(phases[0].end).toBe("2027-01-03");
    expect(phases[1].start).toBe("2027-01-04");
    expect(phases[3].end).toBe("2027-06-06");
    expect(phases[3].start).toBe("2027-05-24"); // 2-week taper
    expect(phases[2].start).toBe("2027-03-29"); // 8 weeks race-specific
  });

  it("drops volume when the cut runs into race prep", () => {
    const tight = buildPhases({ ...plan, raceDate: "2027-02-28" });
    expect(tight.map((p) => p.key)).toEqual(["base", "race", "taper"]);
    expect(tight[0].end < tight[1].start).toBe(true);
  });

  it("knows where a date falls", () => {
    const s = phaseOn(plan, "2026-10-07");
    expect(s.kind).toBe("active");
    if (s.kind === "active") {
      expect(s.phase.key).toBe("base");
      expect(s.week).toBe(2);
      expect(s.daysToRace).toBe(242);
    }
    expect(phaseOn(plan, "2026-09-01").kind).toBe("before");
    expect(phaseOn(plan, "2027-06-07").kind).toBe("after");
  });

  it("clamps macro-target phase outside the plan", () => {
    expect(targetPhaseKey(plan, "2026-09-01")).toBe("base");
    expect(targetPhaseKey(plan, "2027-02-01")).toBe("volume");
    expect(targetPhaseKey(plan, "2027-07-01")).toBe("taper");
  });
});
