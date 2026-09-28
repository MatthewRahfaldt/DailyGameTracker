import { dateFromPuzzleNumber, parseGeoDateLabel, resolveGeoDate, type PuzzleAnchor } from "@dgt/parsers";
import { prisma } from "@/lib/prisma";
import { todayInTimezone } from "@/lib/timezone";

/**
 * App-layer wiring around packages/parsers/src/dating.ts (historical import — see
 * docs/BACKLOG.md). That module is pure date arithmetic; this file is what feeds it real data —
 * looking up a calibration anchor in the database for games with no public epoch, and picking
 * which resolution strategy applies to which game.
 *
 * Everything here is called from one place: `saveGameResult` (apps/web/src/lib/game-results.ts),
 * the same paste box used for both a normal daily paste and backfilling an old result — there's no
 * separate import page. The four puzzle-numbered games are always "certain" regardless of when
 * they're pasted, so they never need a confirmation step. GeoSports/GeoHistory are the only games
 * that ever do, and only when the pasted date doesn't match today (see `resolveGeoDateForPaste`).
 */

export type DateConfidence = "certain" | "needs-confirmation";

export interface DateResolution {
  /** YYYY-MM-DD */
  date: string;
  confidence: DateConfidence;
  reason: string;
}

/** Games that print a sequential puzzle number in their share text — date is derivable. */
export const PUZZLE_NUMBERED_GAMES = new Set(["wordle", "connections", "catfishing", "landmarkr"]);

/** Games that print only a year-less date label — date requires a year guess or confirmation. */
export const GEO_GAMES = new Set(["geosports", "geohistory"]);

function extractPuzzleNumber(data: unknown): number | undefined {
  if (data && typeof data === "object" && "puzzleNumber" in data) {
    const value = (data as { puzzleNumber: unknown }).puzzleNumber;
    return typeof value === "number" ? value : undefined;
  }
  return undefined;
}

function extractDateLabel(data: unknown): string | undefined {
  if (data && typeof data === "object" && "date" in data) {
    const value = (data as { date: unknown }).date;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

/**
 * Find a calibration anchor for a game with no public epoch (Catfishing, Landmarkr): any
 * previously-saved result for this game that has a puzzleNumber in its parsedData.
 *
 * Scoped by `gameId` only, not by user — a puzzle number means the same calendar day for every
 * player, so any user's prior saved result is just as valid an anchor as the current user's own,
 * and this makes an anchor available immediately even for someone's very first import of a game
 * other people already track. Pulls a handful of recent rows and filters in JS rather than a
 * Prisma JSON-path query, since JSON-path filtering semantics are finicky across providers and
 * this table is never large enough for it to matter.
 */
async function findPuzzleAnchor(gameId: string): Promise<PuzzleAnchor | undefined> {
  const rows = await prisma.gameResult.findMany({
    where: { gameId },
    orderBy: { playedDate: "desc" },
    take: 20,
    select: { playedDate: true, parsedData: true },
  });

  for (const row of rows) {
    const puzzleNumber = extractPuzzleNumber(row.parsedData);
    if (puzzleNumber !== undefined) {
      return { puzzleNumber, date: row.playedDate.toISOString().slice(0, 10) };
    }
  }

  return undefined;
}

/**
 * Resolve the played-date for one of the four puzzle-numbered games. Shared by the daily paste
 * box (which only ever calls this for those four games) and the historical import flow.
 */
export async function resolvePuzzleNumberedDate(
  gameKey: string,
  gameId: string,
  data: unknown,
  timezone: string,
): Promise<DateResolution> {
  const puzzleNumber = extractPuzzleNumber(data);
  if (puzzleNumber === undefined) {
    return {
      date: todayInTimezone(timezone),
      confidence: "needs-confirmation",
      reason: "Couldn't find a puzzle number in this result — using today's date.",
    };
  }

  const direct = dateFromPuzzleNumber(gameKey, puzzleNumber);
  if (direct) return direct;

  const anchor = await findPuzzleAnchor(gameId);
  const calibrated = dateFromPuzzleNumber(gameKey, puzzleNumber, anchor);
  if (calibrated) return calibrated;

  return {
    date: todayInTimezone(timezone),
    confidence: "needs-confirmation",
    reason:
      "This is the first result saved for this game, so there's nothing yet to derive its date from — defaulting to today. Set the date if this isn't from today.",
  };
}

/**
 * Resolve the played-date for a Geo-family game (GeoSports, GeoHistory) from its year-less date
 * label, respecting the user's `assumeRecentImports` setting. Always `needs-confirmation` — there's
 * no puzzle number to be certain about a year-less label, whenever this is actually called (see
 * `resolveGeoDateForPaste`, the entry point `saveGameResult` uses, for the fast path that skips
 * this entirely when the label is obviously today).
 */
export function resolveGeoPlayedDate(data: unknown, assumeRecentImports: boolean): DateResolution {
  const label = extractDateLabel(data);
  if (label === undefined) {
    return {
      date: new Date().toISOString().slice(0, 10),
      confidence: "needs-confirmation",
      reason: "Couldn't find a date label in this result — please set the date yourself.",
    };
  }
  return resolveGeoDate(label, { assumeRecentImports });
}

/**
 * Resolve a Geo-family result's played-date the way the single paste box needs it: if the label
 * matches today's real month/day (in the user's timezone), it's unambiguously today's puzzle —
 * `certain`, no confirmation needed, so a normal same-day paste stays exactly as frictionless as
 * it always was. Only when the label doesn't match today (an old screenshot being backfilled)
 * does this fall through to `resolveGeoPlayedDate`'s year-guessing, which is deliberately
 * `needs-confirmation` so `saveGameResult` can ask before saving instead of guessing silently.
 */
export function resolveGeoDateForPaste(
  data: unknown,
  todayIso: string,
  assumeRecentImports: boolean,
): DateResolution {
  const label = extractDateLabel(data);
  if (label !== undefined) {
    const parsedLabel = parseGeoDateLabel(label);
    if (parsedLabel) {
      const [, todayMonth, todayDay] = todayIso.split("-").map(Number);
      if (parsedLabel.month === todayMonth && parsedLabel.day === todayDay) {
        return { date: todayIso, confidence: "certain", reason: "Matches today's date." };
      }
    }
  }
  return resolveGeoPlayedDate(data, assumeRecentImports);
}
