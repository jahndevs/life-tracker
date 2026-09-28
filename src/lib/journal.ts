import { currentStreak, tally } from "@/lib/adherence";
import { addDays, diffDays, type ISODate } from "@/lib/dates";

export const MOODS = [
  { value: 1, label: "Rough" },
  { value: 2, label: "Low" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
] as const;

const MAX_TAGS = 10;

/** "#Training, sleep  long-run" → ["training", "sleep", "long-run"] */
export function parseTags(input: string): string[] {
  const tags = input
    .split(/[\s,]+/)
    .map((t) =>
      t
        .replace(/^#+/, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 30),
    )
    .filter(Boolean);
  return [...new Set(tags)].slice(0, MAX_TAGS);
}

export function journalStreak(entryDates: Iterable<ISODate>, today: ISODate): number {
  const dates = new Set(entryDates);
  const sorted = [...dates].sort();
  if (sorted.length === 0) return 0;
  const from = sorted[0];
  if (diffDays(from, today) < 0) return 0;
  const days = Array.from({ length: diffDays(from, today) + 1 }, (_, i) => ({
    overall: tally([dates.has(addDays(from, i))]),
  }));
  return currentStreak(days, 100);
}

export function snippet(body: string, length = 160): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length).trimEnd()}…` : flat;
}
