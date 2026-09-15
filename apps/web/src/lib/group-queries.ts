import { type DateString, type FeedItem, normalizeDate, toUtcDate } from "@dgt/stats";
import type { GameResult } from "@dgt/types";
import { prisma } from "@/lib/prisma";

export interface ReactionSummary {
  emoji: string;
  count: number;
  /** Whether the current viewer is one of the people who reacted with this emoji. */
  reactedByMe: boolean;
}

export interface GroupFeedItem extends FeedItem {
  reactions: ReactionSummary[];
}

/**
 * Feed results for one group (docs/BACKLOG.md, Milestone 5 — "Group dashboard & shared stats").
 *
 * Unlike the personal Follow feed (feed-queries.ts), which shows everything a followed person
 * plays, this is scoped to GroupGame — only results for games the group has actually assigned.
 * That scoping is what makes "assign a game to the group" mean something: members see each
 * other's *shared* games here, not each other's whole personal history.
 */
export async function loadGroupFeedResults(
  groupId: string,
  viewerId: string,
  since: DateString,
): Promise<GroupFeedItem[]> {
  const [members, groupGames] = await Promise.all([
    prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } }),
    prisma.groupGame.findMany({ where: { groupId }, select: { gameId: true } }),
  ]);
  const memberIds = members.map((m) => m.userId);
  const gameIds = groupGames.map((g) => g.gameId);
  if (memberIds.length === 0 || gameIds.length === 0) return [];

  const rows = await prisma.gameResult.findMany({
    where: {
      userId: { in: memberIds },
      gameId: { in: gameIds },
      playedDate: { gte: toUtcDate(since) },
    },
    orderBy: [{ playedDate: "desc" }, { createdAt: "desc" }],
    include: {
      game: true,
      user: { select: { id: true, name: true, image: true } },
      reactions: true,
    },
    take: 200,
  });

  return rows.map((row) => {
    const byEmoji = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const reaction of row.reactions) {
      const existing = byEmoji.get(reaction.emoji) ?? { count: 0, reactedByMe: false };
      existing.count += 1;
      if (reaction.userId === viewerId) existing.reactedByMe = true;
      byEmoji.set(reaction.emoji, existing);
    }

    return {
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
      reactions: [...byEmoji.entries()].map(([emoji, { count, reactedByMe }]) => ({
        emoji,
        count,
        reactedByMe,
      })),
    };
  });
}

/**
 * All-time results for every member of a group, for `buildStandings` (@dgt/stats) to turn into a
 * per-game leaderboard. All-time (not windowed like the feed above) because streaks/best-streak/
 * win-rate are meant to reflect a member's whole history, same as their personal /stats page.
 */
export async function loadGroupMemberResults(
  groupId: string,
): Promise<Array<{ actor: { id: string; name: string; image: string | null }; results: GameResult[] }>> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
  if (members.length === 0) return [];

  const results = await prisma.gameResult.findMany({
    where: { userId: { in: members.map((m) => m.userId) } },
  });

  const byUser = new Map<string, GameResult[]>();
  for (const row of results) {
    const list = byUser.get(row.userId) ?? [];
    list.push({
      id: row.id,
      userId: row.userId,
      gameId: row.gameId,
      playedDate: normalizeDate(row.playedDate),
      guesses: row.guesses,
      won: row.won,
      rawText: row.rawText,
      parsedData: (row.parsedData as Record<string, unknown> | null) ?? null,
    });
    byUser.set(row.userId, list);
  }

  return members.map((member) => ({
    actor: {
      id: member.user.id,
      name: member.user.name ?? "Someone",
      image: member.user.image ?? null,
    },
    results: byUser.get(member.userId) ?? [],
  }));
}
