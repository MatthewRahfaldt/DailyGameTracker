import {
  type GameStats,
  type HeatmapDay,
  type HeatmapSummary,
  buildHeatmap,
  computeAllStats,
  makeFixture,
  summarizeHeatmap,
  todayUtc,
  trailingYear,
} from "@dgt/stats";
import type { Game } from "@dgt/types";

export interface StatsView {
  user: { id: string; name: string };
  games: Game[];
  range: { start: string; end: string };
  days: HeatmapDay[];
  summary: HeatmapSummary;
  stats: GameStats[];
  /** True while this is generated data. Drives the demo banner. */
  isDemo: boolean;
}

/**
 * TEMPORARY — generated dummy data for one hardcoded demo player.
 *
 * This is the auth seam. Milestone 1/3 replaces the body with:
 *   1. resolve the signed-in user from the session (redirect to sign-in if there isn't one),
 *   2. load their `UserGame` rows for `games`/`assignedGameIds`,
 *   3. load their `GameResult` rows within `range`,
 *   4. set `isDemo: false`.
 *
 * Deliberately `async` even though nothing here awaits: the real implementation will await
 * the session and the database, and making that change here would otherwise ripple out into
 * the page's signature. Callers already await, so the swap stays local to this file.
 */
export const DEMO_USER = { id: "user-demo", name: "Demo player" };

export async function getStatsView(today: string = todayUtc()): Promise<StatsView> {
  const range = trailingYear(today);
  const { games, assignedGameIds, results } = makeFixture({ end: today });

  const days = buildHeatmap(results, assignedGameIds, range);

  return {
    user: DEMO_USER,
    games,
    range,
    days,
    summary: summarizeHeatmap(days),
    stats: computeAllStats(results, assignedGameIds, today),
    isDemo: true,
  };
}
