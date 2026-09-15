import { addDays, buildStandings, mergeFeed, todayUtc, type MemberStanding } from "@dgt/stats";
import type { Game, GroupRole } from "@dgt/types";
import { prisma } from "@/lib/prisma";
import { loadGroupFeedResults, loadGroupMemberResults, type GroupFeedItem } from "./group-queries";

/** How far back the group feed reaches — same window as the personal follow feed. */
export const GROUP_FEED_DAYS = 30;

export interface GroupMemberView {
  id: string;
  name: string;
  image: string | null;
  role: GroupRole;
}

export interface GroupStanding {
  game: Game;
  standings: MemberStanding[];
}

export interface GroupView {
  id: string;
  name: string;
  inviteCode: string;
  hasPassword: boolean;
  /** null when the viewer isn't a member — the page uses this to gate the feed/stats/roster. */
  viewerRole: GroupRole | null;
  members: GroupMemberView[];
  games: Game[];
  feed: GroupFeedItem[];
  standings: GroupStanding[];
}

/**
 * Assembles everything the group page needs in one call (docs/BACKLOG.md, Milestone 5 — "Group
 * dashboard & shared stats"). Feed and standings are only loaded for members — a non-member only
 * ever sees the group's name and member count (via the join flow), never anyone's results.
 */
interface RawGroupWithMembersAndGames {
  id: string;
  name: string;
  inviteCode: string;
  passwordHash: string | null;
  members: Array<{
    userId: string;
    role: string;
    user: { id: string; name: string | null; image: string | null };
  }>;
  groupGames: Array<{ gameId: string; game: Game }>;
}

export async function getGroupView(groupId: string, viewerId: string): Promise<GroupView | null> {
  const group = (await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
      groupGames: { include: { game: true } },
    },
  })) as RawGroupWithMembersAndGames | null;
  if (!group) return null;

  const viewerMembership = group.members.find((m) => m.userId === viewerId);
  const games = group.groupGames.map((gg) => gg.game);
  const isMember = viewerMembership != null;

  const since = addDays(todayUtc(), -(GROUP_FEED_DAYS - 1));
  const [feed, memberResults] = isMember
    ? await Promise.all([loadGroupFeedResults(groupId, viewerId, since), loadGroupMemberResults(groupId)])
    : [[] as GroupFeedItem[], [] as Awaited<ReturnType<typeof loadGroupMemberResults>>];

  return {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    hasPassword: group.passwordHash != null,
    viewerRole: (viewerMembership?.role as GroupRole | undefined) ?? null,
    members: group.members.map((m) => ({
      id: m.user.id,
      name: m.user.name ?? "Someone",
      image: m.user.image ?? null,
      role: m.role as GroupRole,
    })),
    games,
    feed: mergeFeed(feed, since) as GroupFeedItem[],
    standings: games.map((game) => ({
      game,
      standings: buildStandings(memberResults, game.id),
    })),
  };
}
