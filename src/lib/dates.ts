// Calendar dates as "YYYY-MM-DD" strings. Arithmetic runs in UTC so DST
// never shifts a day.

export type ISODate = string;

const DAY_MS = 86_400_000;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function isISODate(value: unknown): value is ISODate {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(toUTC(value));
}

function toUTC(date: ISODate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function todayIn(timeZone: string, now = new Date()): ISODate {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * DAY_MS);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

/** 0 = Monday … 6 = Sunday. */
export function weekday(date: ISODate): number {
  return (new Date(toUTC(date)).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, -weekday(date));
}

export function weekDates(anyDayInWeek: ISODate): ISODate[] {
  const monday = startOfWeek(anyDayInWeek);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatDate(date: ISODate, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    new Date(toUTC(date)),
  );
}

export function formatShort(date: ISODate): string {
  return formatDate(date, { weekday: "short", month: "short", day: "numeric" });
}

export function formatLong(date: ISODate): string {
  return formatDate(date, { weekday: "long", month: "long", day: "numeric" });
}
