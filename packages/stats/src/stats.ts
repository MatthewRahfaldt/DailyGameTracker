import type { GameResult } from "@dgt/types";
import { type DateString, diffDays, normalizeDate, todayUtc } from "./dates";

/** Per-game stats (docs/BACKLOG.md, Milestone 4 — "Per-game stats"). */
export interface GameStats {
  gameId: string;
  /** Distinct UTC days with a result. */
  played: number;
  wins: number;
  losses: number;
  /** 0..1 over results that record a win/loss; null when none do (never played, or a
   *  game with no win/lose state) so callers can show "—" instead of a misleading 0%. */
  winRate: number | null;
  /** Mean guesses over results that record one; null when none do. */
  averageGuesses: number | null;
  /** Consecutive days ending today or yesterday; 0 if the streak is broken. */
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: DateString | null;
}

/**
 * At most one result per UTC day for this game, keyed by day.
 *
 * Every aggregate below is derived from this map, so counts can't disagree with each other:
 * a duplicate row used to inflate `wins` while leaving `played` correct, which skewed the
 * win-rate denominator. Last write wins, matching buildHeatmap and the
 * @@unique([userId, gameId, playedDate]) constraint in prisma/schema.prisma.
 */
function dedupeByDay(
  results: readonly GameResult[],
  gameId: string,
): Map<DateString, GameResult> {
  const byDate = new Map<DateString, GameResult>();
  for (const result of results) {
    if (result.gameId !== gameId) continue;
    byDate.set(normalizeDate(result.playedDate), result);
  }
  return byDate;
}

function longestRun(dates: readonly DateString[]): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < dates.length; i++) {
    run = i > 0 && diffDays(dates[i - 1], dates[i]) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/**
 * The run ending today or yesterday.
 *
 * Yesterday still counts so that today's unplayed game doesn't read as a broken streak
 * before the day is over. Results dated in the future are ignored here — under UTC-only
 * dates they mean clock skew or bad data, not a live streak.
 */
function currentRun(dates: readonly DateString[], today: DateString): number {
  if (dates.length === 0) return 0;
  const gap = diffDays(dates[dates.length - 1], today);
  if (gap < 0 || gap > 1) return 0;

  let run = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    if (diffDays(dates[i - 1], dates[i]) !== 1) break;
    run++;
  }
  return run;
}

export function computeGameStats(
  results: readonly GameResult[],
  gameId: string,
  today: DateString = todayUtc(),
): GameStats {
  const byDate = dedupeByDay(results, gameId);
  const dates = [...byDate.keys()].sort();
  const mine = [...byDate.values()];

  const decided = mine.filter((result) => result.won !== null && result.won !== undefined);
  const wins = decided.filter((result) => result.won).length;

  const guessed = mine
    .map((result) => result.guesses)
    .filter((guesses): guesses is number => typeof guesses === "number");

  return {
    gameId,
    played: dates.length,
    wins,
    losses: decided.length - wins,
    winRate: decided.length === 0 ? null : wins / decided.length,
    averageGuesses:
      guessed.length === 0 ? null : guessed.reduce((a, b) => a + b, 0) / guessed.length,
    currentStreak: currentRun(dates, today),
    bestStreak: longestRun(dates),
    lastPlayedDate: dates.at(-1) ?? null,
  };
}

/** Stats for every tracked game, in the order the games were given. */
export function computeAllStats(
  results: readonly GameResult[],
  assignedGameIds: readonly string[],
  today: DateString = todayUtc(),
): GameStats[] {
  return assignedGameIds.map((gameId) => computeGameStats(results, gameId, today));
}
