import {
  type DateString,
  type GameStatsView,
  type ResultSummary,
  buildHeatmap,
  gameStatsView,
  summarizeResult,
  trailingYear,
} from "@dgt/stats";
import type { Game, GameResult } from "@dgt/types";

/** A heatmap cell as the browser sees it: counts and cards, never raw result rows. */
export interface ClientHeatmapDay {
  date: DateString;
  played: number;
  assigned: number;
  ratio: number;
  cards: ResultSummary[];
}

export interface StatsPageView {
  days: ClientHeatmapDay[];
  perGame: Array<{ game: Game; view: GameStatsView }>;
}

/**
 * Everything a stats page renders. Replaces the old rawText/parsedData redaction in /u/[id]:
 * results are summarized here on the server, so the client heatmap only ever gets display data.
 */
export function buildStatsPageView(
  results: readonly GameResult[],
  games: readonly Game[],
  today: DateString,
): StatsPageView {
  const gameById = new Map(games.map((game) => [game.id, game]));
  const days = buildHeatmap(results, games.map((game) => game.id), trailingYear(today)).map((day) => ({
    date: day.date,
    played: day.played,
    assigned: day.assigned,
    ratio: day.ratio,
    cards: day.results.flatMap((result) => {
      const game = gameById.get(result.gameId);
      return game ? [summarizeResult(result, game)] : [];
    }),
  }));

  return { days, perGame: games.map((game) => ({ game, view: gameStatsView(results, game, today) })) };
}
