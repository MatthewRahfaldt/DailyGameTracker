import { type DateString, type FeedItem, normalizeDate, toUtcDate } from "@dgt/stats";
import type { GameResult } from "@dgt/types";
import { prisma } from "@/lib/prisma";

/**
 * Real feed results, loaded from `GameResult` rows for everyone `viewerId` follows.
 *
 * Notes:
 *  - `take: 200` stands in for pagination, which is deliberately out of scope.
 *  - playedDate is @db.Date — compare against a date-only value or results shift by a timezone.
 *  - The `{ in: ids }` lookup is what the Follow primary key serves.
 */
export async function loadFeedResults(
  viewerId: string,
  since: DateString,
): Promise<FeedItem[]> {
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const ids = following.map((f) => f.followingId);
  if (ids.length === 0) return [];

  const rows = await prisma.gameResult.findMany({
    where: { userId: { in: ids }, playedDate: { gte: toUtcDate(since) } },
    orderBy: [{ playedDate: "desc" }, { createdAt: "desc" }],
    include: {
      game: true,
      user: { select: { id: true, name: true, image: true } },
    },
    take: 200,
  });

  return rows.map((row) => ({
    id: row.id,
    actor: {
      id: row.user.id,
      name: row.user.name ?? "Someone",
      image: row.user.image ?? null,
    },
    game: {
      id: row.game.id,
      slug: row.game.slug,
      name: row.game.name,
      parserKey: row.game.parserKey,
      url: row.game.url,
    },
    playedDate: normalizeDate(row.playedDate),
    guesses: row.guesses,
    won: row.won,
  }));
}

/**
 * Real results for the profile page (app/u/[id]/page.tsx).
 *
 * Note: A caller must also load the target user's Game/UserGame rows to supply
 * `games` and `assignedGameIds` — this function returns results only.
 */
export async function loadUserResults(
  userId: string,
  range: { start: DateString; end: DateString },
): Promise<GameResult[]> {
  const rows = await prisma.gameResult.findMany({
    where: {
      userId,
      playedDate: { gte: toUtcDate(range.start), lte: toUtcDate(range.end) },
    },
    orderBy: { playedDate: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    gameId: row.gameId,
    playedDate: normalizeDate(row.playedDate),
    guesses: row.guesses,
    won: row.won,
    rawText: row.rawText,
    parsedData: (row.parsedData as Record<string, unknown> | null) ?? null,
  }));
}
