import {
  type GameStats,
  type HeatmapDay,
  type HeatmapSummary,
  buildHeatmap,
  computeAllStats,
  makeFixture,
  normalizeDate,
  summarizeHeatmap,
  toUtcDate,
  todayUtc,
  trailingYear,
} from "@dgt/stats";
import type { Game, GameResult } from "@dgt/types";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface StatsView {
  user: { id: string; name: string };
  games: Game[];
  range: { start: string; end: string };
  days: HeatmapDay[];
  summary: HeatmapSummary;
  stats: GameStats[];
  /** True while this is generated data (signed out, or a stale session). Drives the demo banner. */
  isDemo: boolean;
}

/** Generated dummy data for one hardcoded demo player — shown to signed-out visitors. */
export const DEMO_USER = { id: "user-demo", name: "Demo player" };

function demoStatsView(today: string): StatsView {
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

/**
 * Load the signed-in user's real games/results for `range` (docs/BACKLOG.md, Milestone 4).
 *
 * Deliberately reads only the columns `saveGameResult` already computed at write time
 * (`guesses`, `won`, `playedDate`) plus `parsedData` — this file, and everything in
 * `@dgt/stats`, never imports `@dgt/parsers` or re-parses `rawText`. See the storage-design
 * comment on `saveGameResult` (src/lib/game-results.ts) for why that split exists.
 */
async function realStatsView(userId: string, today: string): Promise<StatsView | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const userGames = await prisma.userGame.findMany({
    where: { userId: user.id },
    include: { game: true },
  });
  const games: Game[] = userGames.map(({ game }) => ({
    id: game.id,
    slug: game.slug,
    name: game.name,
    parserKey: game.parserKey,
    url: game.url,
  }));
  const assignedGameIds = games.map((game) => game.id);

  const range = trailingYear(today);
  const rows = await prisma.gameResult.findMany({
    where: {
      userId: user.id,
      playedDate: { gte: toUtcDate(range.start), lte: toUtcDate(range.end) },
    },
  });
  const results: GameResult[] = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    gameId: row.gameId,
    playedDate: normalizeDate(row.playedDate),
    guesses: row.guesses,
    won: row.won,
    rawText: row.rawText,
    parsedData: row.parsedData as unknown as Record<string, unknown> | null,
  }));

  const days = buildHeatmap(results, assignedGameIds, range);

  return {
    user: { id: user.id, name: user.name ?? user.email },
    games,
    range,
    days,
    summary: summarizeHeatmap(days),
    stats: computeAllStats(results, assignedGameIds, today),
    isDemo: false,
  };
}

/**
 * Signed in → the real thing, built from `GameResult`/`UserGame` rows. Signed out (or a stale
 * session pointing at a deleted user) → generated sample data, so the page still has something
 * to show off and doubles as a preview of what signing in gets you.
 */
export async function getStatsView(today: string = todayUtc()): Promise<StatsView> {
  const session = await auth();
  if (session?.user) {
    const view = await realStatsView(session.user.id, today);
    if (view) return view;
  }
  return demoStatsView(today);
}
