import type { DateString, FeedItem } from "@dgt/stats";
import type { GameResult } from "@dgt/types";
import { prisma } from "@/lib/prisma";

/**
 * REAL IMPLEMENTATION — intentionally not wired up yet.
 *
 * Blocked on: nothing writes GameResult (PasteBox parses but never persists).
 * To switch over: implement result saving, then change getFeedView() in demo-feed.ts to
 * call this instead of makeFixture(), and set isDemo: false. The return type is identical,
 * so no caller changes.
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
    where: { userId: { in: ids }, playedDate: { gte: new Date(`${since}T00:00:00Z`) } },
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
    },
    playedDate: row.playedDate.toISOString().slice(0, 10),
    guesses: row.guesses,
    won: row.won,
  }));
}

/**
 * REAL IMPLEMENTATION for the profile page — also not wired up yet.
 * Replaces the makeFixture() call in app/u/[id]/page.tsx once results are saved.
 *
 * Note: A caller switching this on must also load the user's Game/UserGame rows
 * to supply `games` and `assignedGameIds`, which makeFixture() currently returns
 * alongside the results. This function returns results only.
 */
export async function loadUserResults(
  userId: string,
  range: { start: DateString; end: DateString },
): Promise<GameResult[]> {
  const rows = await prisma.gameResult.findMany({
    where: {
      userId,
      playedDate: {
        gte: new Date(`${range.start}T00:00:00Z`),
        lte: new Date(`${range.end}T00:00:00Z`),
      },
    },
    orderBy: { playedDate: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    gameId: row.gameId,
    playedDate: row.playedDate.toISOString().slice(0, 10),
    guesses: row.guesses,
    won: row.won,
    rawText: row.rawText,
    parsedData: (row.parsedData as Record<string, unknown> | null) ?? null,
  }));
}
