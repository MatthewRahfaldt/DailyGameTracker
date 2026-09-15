import { type ResultSummary, summarizeResult } from "@dgt/stats";
import type { Game } from "@dgt/types";
import { prisma } from "@/lib/prisma";
import { toGame, toGameResult } from "@/lib/result-rows";
import { todayInTimezone } from "@/lib/timezone";

export interface TodayView {
  /** YYYY-MM-DD in the user's own timezone — the same day saveGameResult writes to. */
  date: string;
  games: Array<{ game: Game; summary: ResultSummary | null }>;
}

/** Each tracked game with today's card, or null when it hasn't been played yet. */
export async function getTodayView(userId: string): Promise<TodayView | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  if (!user) return null;

  const date = todayInTimezone(user.timezone);
  const userGames = await prisma.userGame.findMany({
    where: { userId },
    include: { game: true },
    orderBy: { game: { name: "asc" } },
  });
  const rows = await prisma.gameResult.findMany({
    where: { userId, gameId: { in: userGames.map((userGame) => userGame.gameId) }, playedDate: new Date(date) },
  });
  const resultByGameId = new Map(rows.map((row) => [row.gameId, toGameResult(row)]));

  return {
    date,
    games: userGames.map(({ game: row }) => {
      const game = toGame(row);
      const result = resultByGameId.get(game.id);
      return { game, summary: result ? summarizeResult(result, game) : null };
    }),
  };
}
