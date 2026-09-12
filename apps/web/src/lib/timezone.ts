/**
 * Convert "right now" into the calendar day it falls on inside an IANA timezone, e.g.
 * "America/Chicago" (docs/BACKLOG.md, "Build the paste-box UI on the homepage").
 *
 * This is what `User.timezone` (set on /profile) is actually for: a result pasted at 11:50pm
 * Central still counts as "today" for that user even though it's already tomorrow in UTC.
 * `@dgt/stats`'s date module is deliberately UTC-only for now (see packages/stats/src/dates.ts —
 * "switching to per-user timezones later means changing this file, not every call site"). Until
 * that happens, this is the one place that turns "now, in this user's zone" into the plain
 * YYYY-MM-DD stored on `GameResult.playedDate` — everything downstream (the heatmap, streaks)
 * just treats that string as a calendar day and never needs to know about timezones itself.
 */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  // The en-CA locale happens to format as YYYY-MM-DD, so there's no string surgery needed.
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
}
