/**
 * Turns a parsed game result into the calendar date it should be stored under
 * (docs/BACKLOG.md — historical import).
 *
 * This module is deliberately pure — no Prisma, no `Date.now()` unless a caller opts in via
 * `referenceDate` — so it's usable from both the live daily paste box
 * (apps/web/src/lib/game-results.ts) and the historical-import flow, and is unit-testable without
 * a database.
 *
 * Why this exists: Wordle, Connections, Catfishing, and Landmarkr each print a sequential puzzle
 * number in their share text but no date. Stamping every paste with "today, in the user's
 * timezone" (the original behavior) silently mis-dates anything pasted late — a next-morning
 * paste, or a year-old screenshot someone is backfilling. Since each of those games ships exactly
 * one puzzle per calendar day, the puzzle number *is* the date once you know a single
 * (puzzleNumber, date) pair for that game — every other date follows by simple day-offset
 * arithmetic, no guessing required.
 *
 * GeoSports and GeoHistory go the opposite way: their share text has a year-less date label
 * ("August 29th") and no puzzle number at all, so there's no arithmetic to anchor on — just a
 * "which year did they mean" judgment call, which `resolveGeoDate` makes explicit rather than
 * silent.
 */

export type DateConfidence = "certain" | "needs-confirmation";

export interface ResolvedDate {
  /** YYYY-MM-DD */
  date: string;
  confidence: DateConfidence;
  /** Short human-readable note on how the date was derived — surfaced in the import UI. */
  reason: string;
}

/** One known-good (puzzleNumber, date) pair used to derive every other date for that game. */
export interface PuzzleAnchor {
  puzzleNumber: number;
  /** YYYY-MM-DD */
  date: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Add `days` (may be negative) to an ISO YYYY-MM-DD date, staying in whole calendar days. */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  // UTC-anchored on purpose: every date here is a plain calendar day, never a timestamp, so
  // there's no timezone/DST arithmetic to get wrong.
  const base = Date.UTC(y, m - 1, d);
  return new Date(base + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * Public, independently-verified puzzle #1 epochs — each cross-checked against multiple
 * widely-separated, dated public sources (see the historical-import writeup in the project
 * backlog for citations), not a guess:
 *   - Wordle #1: 2021-06-20 (the game's own well-documented launch numbering).
 *   - NYT Connections #1: 2023-06-12 (NYT's own announced launch date).
 * Catfishing and Landmarkr have no discoverable public epoch — see the `anchor` parameter below.
 */
const KNOWN_EPOCHS: Record<string, PuzzleAnchor> = {
  wordle: { puzzleNumber: 1, date: "2021-06-20" },
  connections: { puzzleNumber: 1, date: "2023-06-12" },
};

/**
 * Resolve the calendar date for a puzzle-numbered game (Wordle, Connections, Catfishing,
 * Landmarkr).
 *
 * - If `gameKey` has a known public epoch, the date is exact arithmetic off a verified pair, so
 *   `confidence` is "certain".
 * - Otherwise, if an `anchor` is supplied — one of the app's own previously-saved results for
 *   this game, with a known puzzleNumber and playedDate — calibrate off that instead. This is
 *   still exact arithmetic, not a guess, so it's also "certain": the only assumption is that the
 *   anchor itself was dated correctly, which is the same trust already placed in every saved
 *   result today.
 * - If neither is available (e.g. the very first Catfishing/Landmarkr result anyone ever saves),
 *   there's nothing to derive a date from — returns undefined and the caller falls back to
 *   "today" (or asks the user).
 */
export function dateFromPuzzleNumber(
  gameKey: string,
  puzzleNumber: number,
  anchor?: PuzzleAnchor,
): ResolvedDate | undefined {
  const epoch = KNOWN_EPOCHS[gameKey];
  if (epoch) {
    return {
      date: addDays(epoch.date, puzzleNumber - epoch.puzzleNumber),
      confidence: "certain",
      reason: `Derived from ${gameKey}'s puzzle #${epoch.puzzleNumber} epoch (${epoch.date}).`,
    };
  }

  if (anchor) {
    return {
      date: addDays(anchor.date, puzzleNumber - anchor.puzzleNumber),
      confidence: "certain",
      reason: `Calibrated from your own puzzle #${anchor.puzzleNumber} result on ${anchor.date}.`,
    };
  }

  return undefined;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

// Matches "August 29th", "August 29", "Aug. 29", etc. — whatever createGeoScoreParser's
// GeoScoreData.date field hands us.
const DATE_LABEL_RE = /([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?/i;

/**
 * Parse a Geo-family date label like "August 29th" into a month/day pair. Returns undefined if
 * the label doesn't contain a recognizable month name, so callers can treat that as
 * "needs-confirmation" instead of throwing — the rest of the result still parsed fine.
 */
export function parseGeoDateLabel(label: string): { month: number; day: number } | undefined {
  const match = label.match(DATE_LABEL_RE);
  if (!match) return undefined;

  const monthIndex = MONTHS.findIndex((month) => month.startsWith(match[1].toLowerCase()));
  if (monthIndex === -1) return undefined;

  const day = Number(match[2]);
  if (!Number.isInteger(day) || day < 1 || day > 31) return undefined;

  return { month: monthIndex + 1, day };
}

function isoFor(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Resolve a year-less Geo-family date label ("August 29th") to a full calendar date.
 *
 * There's no puzzle number to anchor on here, so this always involves a judgment call about the
 * year — the reason for the `assumeRecentImports` user setting (docs/BACKLOG.md, historical
 * import). Both branches below return `confidence: "needs-confirmation"`, so the import UI always
 * shows an editable, pre-filled date field rather than silently trusting a guess:
 *
 * - `assumeRecentImports: true` (the default): pick whichever of "this year" / "last year" is
 *   the more recent calendar date that isn't in the future relative to `referenceDate` — i.e.
 *   assume the pasted result is from sometime in the last year, which is what most historical
 *   backfills actually are.
 * - `assumeRecentImports: false`: don't guess a year at all — use `referenceDate`'s year as a
 *   placeholder so there's always a valid date to prefill, but flag it clearly for the user to
 *   correct.
 */
export function resolveGeoDate(
  label: string,
  options: { assumeRecentImports: boolean; referenceDate?: Date } = { assumeRecentImports: true },
): ResolvedDate {
  const referenceDate = options.referenceDate ?? new Date();
  const referenceYear = referenceDate.getUTCFullYear();
  const parsedLabel = parseGeoDateLabel(label);

  if (!parsedLabel) {
    return {
      date: referenceDate.toISOString().slice(0, 10),
      confidence: "needs-confirmation",
      reason: `Couldn't read a date out of "${label}" — please set the date yourself.`,
    };
  }

  const { month, day } = parsedLabel;

  if (!options.assumeRecentImports) {
    return {
      date: isoFor(referenceYear, month, day),
      confidence: "needs-confirmation",
      reason: `"${label}" has no year — confirm which year this was.`,
    };
  }

  // Try this year and last year; prefer whichever is not in the future and closest to
  // referenceDate (i.e. most recent). If both would be in the future (shouldn't normally
  // happen), fall back to the closer of the two anyway rather than refusing to answer.
  const candidates = [referenceYear, referenceYear - 1].map((year) => {
    const iso = isoFor(year, month, day);
    const ageDays = Math.round(
      (referenceDate.getTime() - new Date(`${iso}T00:00:00Z`).getTime()) / MS_PER_DAY,
    );
    return { iso, ageDays };
  });

  const notFuture = candidates.filter((candidate) => candidate.ageDays >= 0);
  const pool = notFuture.length > 0 ? notFuture : candidates;
  const best = pool.reduce((closest, candidate) =>
    Math.abs(candidate.ageDays) < Math.abs(closest.ageDays) ? candidate : closest,
  );

  return {
    date: best.iso,
    confidence: "needs-confirmation",
    reason: `"${label}" has no year — assumed ${best.iso.slice(0, 4)} since that's within the last year. Double-check before saving.`,
  };
}
