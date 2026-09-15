import { type DateString, toUtcDate, trailingYear } from "@dgt/stats";
import type { Game, GameResult } from "@dgt/types";
import { prisma } from "@/lib/prisma";
import { toGame, toGameResult } from "@/lib/result-rows";

/** A user's tracked games (by name) and their last year of results. */
export async function loadStatsInputs(
  userId: string,
  today: DateString,
): Promise<{ games: Game[]; results: GameResult[] }> {
  const range = trailingYear(today);
  const [userGames, rows] = await Promise.all([
    prisma.userGame.findMany({ where: { userId }, include: { game: true }, orderBy: { game: { name: "asc" } } }),
    prisma.gameResult.findMany({
      where: { userId, playedDate: { gte: toUtcDate(range.start), lte: toUtcDate(range.end) } },
    }),
  ]);
  return { games: userGames.map(({ game }) => toGame(game)), results: rows.map(toGameResult) };
}
