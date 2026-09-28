import { describe, expect, it } from "vitest";
import { yearStats, progressPct } from "@/lib/books";
import { addDays } from "@/lib/dates";
import { cadenceLabel, habitStats, isScheduled } from "@/lib/habits";
import { journalStreak, parseTags } from "@/lib/journal";

const MON = "2026-09-28";

describe("habit schedule", () => {
  const mwf = { cadence: "custom", days: 0b0010101, startDate: MON };

  it("follows cadence", () => {
    expect(isScheduled({ cadence: "weekdays", days: 0, startDate: MON }, "2026-10-03")).toBe(false);
    expect(isScheduled(mwf, "2026-09-30")).toBe(true); // Wed
    expect(isScheduled(mwf, "2026-09-29")).toBe(false); // Tue
    expect(cadenceLabel(mwf)).toBe("Mon, Wed, Fri");
  });

  it("never schedules before the start date", () => {
    expect(isScheduled({ cadence: "daily", days: 0, startDate: MON }, "2026-09-27")).toBe(false);
  });

  it("streaks skip unscheduled days", () => {
    const done = new Set([MON, "2026-09-30", "2026-10-02"]); // Mon, Wed, Fri
    const stats = habitStats(mwf, done, "2026-10-04"); // Sunday
    expect(stats.streak).toBe(3);
    expect(stats.best).toBe(3);
    expect(stats.last30).toEqual({ done: 3, total: 3 });
  });

  it("an unfinished today doesn't break the streak, a missed yesterday does", () => {
    const daily = { cadence: "daily", days: 0, startDate: MON };
    const done = new Set([MON, addDays(MON, 1)]);
    expect(habitStats(daily, done, addDays(MON, 2)).streak).toBe(2);
    expect(habitStats(daily, done, addDays(MON, 3)).streak).toBe(0);
    expect(habitStats(daily, done, addDays(MON, 3)).best).toBe(2);
  });
});

describe("journal", () => {
  it("normalizes tags", () => {
    expect(parseTags("#Training, sleep  long-run,training ,ok!")).toEqual([
      "training",
      "sleep",
      "long-run",
      "ok",
    ]);
  });

  it("counts a writing streak", () => {
    expect(journalStreak([MON, addDays(MON, 1), addDays(MON, 2)], addDays(MON, 3))).toBe(3);
    expect(journalStreak([MON], addDays(MON, 2))).toBe(0);
    expect(journalStreak([], MON)).toBe(0);
  });
});

describe("books", () => {
  it("computes progress and yearly stats", () => {
    expect(progressPct({ pagesRead: 150, pagesTotal: 300 })).toBe(50);
    expect(progressPct({ pagesRead: 150, pagesTotal: null })).toBeNull();

    const stats = yearStats(
      [
        { status: "finished", rating: 5, pagesTotal: 300, pagesRead: 300, finishedAt: "2026-01-10" },
        { status: "finished", rating: 4, pagesTotal: 200, pagesRead: 200, finishedAt: "2026-01-30" },
        { status: "finished", rating: null, pagesTotal: 100, pagesRead: 100, finishedAt: "2026-03-01" },
        { status: "finished", rating: 1, pagesTotal: 999, pagesRead: 999, finishedAt: "2025-12-31" },
        { status: "reading", rating: null, pagesTotal: 400, pagesRead: 10, finishedAt: null },
      ],
      2026,
    );
    expect(stats.count).toBe(3);
    expect(stats.pages).toBe(600);
    expect(stats.avgRating).toBe(4.5);
    expect(stats.perMonth.slice(0, 3)).toEqual([2, 0, 1]);
  });
});
