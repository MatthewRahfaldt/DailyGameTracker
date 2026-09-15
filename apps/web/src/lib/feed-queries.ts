import { type DateString, type FeedItem, normalizeDate, summarizeResult, toUtcDate } from "@dgt/stats";
import { prisma } from "@/lib/prisma";
import { toGame, toGameResult } from "@/lib/result-rows";

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

  return rows.map((row) => {
    const game = toGame(row.game);
    return {
      id: row.id,
      actor: { id: row.user.id, name: row.user.name ?? "Someone", image: row.user.image ?? null },
      game,
      playedDate: normalizeDate(row.playedDate),
      // Computed here so the page never needs rawText/parsedData.
      summary: summarizeResult(toGameResult(row), game),
    };
  });
}
