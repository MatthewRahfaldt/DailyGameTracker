import type { Game, GameResult } from "@dgt/types";
import type { DateString } from "../dates";

/** win/score render in the "good" color, loss in the "bad" color. */
export type Outcome = "win" | "loss" | "score";

/** Everything a result card shows. Safe to send to the browser: no rawText, no parsedData. */
export interface ResultSummary {
  resultId: string;
  gameId: string;
  /** Upper-cased game name, e.g. "WORDLE". */
  label: string;
  /** The one big number, e.g. "3", "845", "✗". */
  value: string;
  /** Smaller text after the value, e.g. "/6", "/1,000", " mistakes". */
  suffix?: string;
  outcome: Outcome;
  /** Emoji share-grid rows; empty when the game's data is unavailable. */
  grid: string[];
}

export interface StatDetail {
  label: string;
  value: string;
}

export interface DistributionBar {
  label: string;
  count: number;
  loss?: boolean;
}

/** One person's stats for one game, already formatted for display. */
export interface GameStatsView {
  gameId: string;
  played: number;
  currentStreak: number;
  bestStreak: number;
  /** Short headline, e.g. "3.9 avg". */
  line: string;
  details: StatDetail[];
  distribution?: DistributionBar[];
  /** The metric group standings sort by; null when there's nothing to rank. */
  rankValue: number | null;
}

export interface GameModule {
  /** Matches Game.parserKey. */
  parserKey: string;
  /** "asc" = lower rankValue is better. */
  rankDirection: "asc" | "desc";
  summarize(result: GameResult, game: Game): ResultSummary;
  stats(results: readonly GameResult[], gameId: string, today: DateString): GameStatsView;
}
