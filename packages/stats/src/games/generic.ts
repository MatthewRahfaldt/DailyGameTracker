import type { Game, GameResult } from "@dgt/types";
import type { DateString } from "../dates";
import { computeGameStats, dedupeByDay } from "../stats";
import type { GameModule, ResultSummary, StatDetail } from "./types";

export function cardFields(result: GameResult, game: Game, grid: string[]) {
  return { resultId: result.id, gameId: game.id, label: game.name.toUpperCase(), grid };
}

/** Fallback card from the `won` column alone — used for unknown games and unreadable data. */
export function baseSummary(result: GameResult, game: Game): ResultSummary {
  const fields = cardFields(result, game, []);
  if (result.won === true) return { ...fields, value: "✓", outcome: "win" };
  if (result.won === false) return { ...fields, value: "✗", outcome: "loss" };
  return { ...fields, value: "Played", outcome: "score" };
}

export interface CommonStats {
  played: number;
  currentStreak: number;
  bestStreak: number;
}

/** Played count and streaks come from computeGameStats so every game shares one definition. */
export function commonStats(
  results: readonly GameResult[],
  gameId: string,
  today: DateString,
): CommonStats {
  const stats = computeGameStats(results, gameId, today);
  return { played: stats.played, currentStreak: stats.currentStreak, bestStreak: stats.bestStreak };
}

/** One result per day for this game (last write wins), oldest first. */
export function dailyResults(results: readonly GameResult[], gameId: string): GameResult[] {
  return [...dedupeByDay(results, gameId).entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, result]) => result);
}

export function detail(label: string, value: string | number): StatDetail {
  return { label, value: String(value) };
}

export const genericModule: GameModule = {
  parserKey: "generic",
  rankDirection: "desc",
  summarize: baseSummary,
  stats(results, gameId, today) {
    const common = commonStats(results, gameId, today);
    return {
      gameId,
      ...common,
      line: `${common.played} played`,
      details: [detail("Played", common.played), detail("Best streak", common.bestStreak)],
      rankValue: common.played === 0 ? null : common.currentStreak,
    };
  },
};
