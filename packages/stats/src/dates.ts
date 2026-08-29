/**
 * UTC-only calendar math (docs/BACKLOG.md, Milestone 4).
 *
 * Every date in this package is a `YYYY-MM-DD` string interpreted as a **UTC** calendar day.
 * All date handling for the app funnels through this module, so switching to per-user
 * timezones later (User.timezone in prisma/schema.prisma) means changing this file, not
 * every call site.
 *
 * Local-time `Date` arithmetic is deliberately avoided: `new Date("2026-08-29")` parses as
 * UTC midnight, but `getDate()`/`getMonth()` read it back in the *host's* zone, silently
 * shifting the day for anyone west of Greenwich. Everything below uses UTC accessors only.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

/** A calendar day in `YYYY-MM-DD` form, always UTC. */
export type DateString = string;

export function isDateString(value: unknown): value is DateString {
  return (
    typeof value === "string" &&
    DATE_RE.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
  );
}

function assertDateString(value: unknown): asserts value is DateString {
  if (!isDateString(value)) {
    throw new RangeError(`Expected a YYYY-MM-DD date string, got ${JSON.stringify(value)}.`);
  }
}

/** Midnight UTC on the given calendar day. */
export function toUtcDate(date: DateString): Date {
  assertDateString(date);
  return new Date(`${date}T00:00:00.000Z`);
}

/** The UTC calendar day a `Date` falls on. */
export function toDateString(date: Date): DateString {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Cannot format an invalid Date.");
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Coerce whatever the API hands us into a `DateString`.
 *
 * Prisma's `playedDate` is `DateTime @db.Date`, which serializes through JSON as a full
 * ISO timestamp ("2026-08-29T00:00:00.000Z") rather than the bare `YYYY-MM-DD` that
 * packages/types advertises. Accept both so callers don't each reinvent this.
 */
export function normalizeDate(value: DateString | Date): DateString {
  if (value instanceof Date) return toDateString(value);
  if (isDateString(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`Could not read ${JSON.stringify(value)} as a date.`);
  }
  return toDateString(parsed);
}

/** Today's UTC calendar day. Pass `now` to make callers deterministic under test. */
export function todayUtc(now: Date = new Date()): DateString {
  return toDateString(now);
}

export function addDays(date: DateString, days: number): DateString {
  return toDateString(new Date(toUtcDate(date).getTime() + days * MS_PER_DAY));
}

/** Whole days from `from` to `to`; negative when `to` precedes `from`. */
export function diffDays(from: DateString, to: DateString): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / MS_PER_DAY);
}

/** Every day from `start` to `end` inclusive. Empty when `end` precedes `start`. */
export function enumerateDays(start: DateString, end: DateString): DateString[] {
  const span = diffDays(start, end);
  if (span < 0) return [];
  return Array.from({ length: span + 1 }, (_, i) => addDays(start, i));
}

/** The 365-day window ending on `end` — the default heatmap range. */
export function trailingYear(end: DateString = todayUtc()): { start: DateString; end: DateString } {
  return { start: addDays(end, -364), end };
}

/** Day of the week for a UTC calendar day: 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: DateString): number {
  return toUtcDate(date).getUTCDay();
}

/** The Sunday on or before `date` — the top of a heatmap column. */
export function startOfWeek(date: DateString): DateString {
  return addDays(date, -dayOfWeek(date));
}

/**
 * Display formatting. `timeZone: "UTC"` is not optional here: without it Intl renders in the
 * host's zone and the label can disagree with the cell it sits on.
 */
export function formatMonthShort(date: DateString): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
    toUtcDate(date),
  );
}

export function formatLongDate(date: DateString): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(toUtcDate(date));
}
