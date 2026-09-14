"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isReactionEmoji } from "@dgt/types";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

type Role = "owner" | "admin" | "member";

const ADMIN_ROLES: readonly Role[] = ["owner", "admin"];

async function requireRole(groupId: string, userId: string, allowed: readonly Role[]) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership || !allowed.includes(membership.role as Role)) {
    throw new Error("You don't have permission to do that in this group.");
  }
  return membership;
}

function revalidateGroup(groupId: string) {
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
}

/**
 * Create a group. The creator becomes its owner (docs/BACKLOG.md, Milestone 5 — "Create/join
 * group UI"). An empty/whitespace-only password is treated as "no password" (open join), same as
 * leaving the field blank.
 *
 * If you already own a group with this exact name (case-insensitive), this updates that group's
 * password instead of creating a second one. There's no separate "rename" or "delete" flow yet —
 * this form is the only "change a group" affordance that exists, so reusing it (e.g. to just
 * change the password) has to update in place rather than spawn a duplicate every time.
 */
export async function createGroup(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in to create a group.");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Give the group a name.");

  const password = String(formData.get("password") ?? "").trim();
  const passwordHash = password ? hashPassword(password) : null;

  const existingOwned = await prisma.groupMember.findFirst({
    where: {
      userId: session.user.id,
      role: "owner",
      group: { name: { equals: name, mode: "insensitive" } },
    },
    select: { groupId: true },
  });

  const group = existingOwned
    ? await prisma.group.update({ where: { id: existingOwned.groupId }, data: { passwordHash } })
    : await prisma.group.create({
        data: {
          name,
          passwordHash,
          members: { create: { userId: session.user.id, role: "owner" } },
        },
      });

  revalidatePath("/groups");
  revalidatePath(`/groups/${group.id}`);
  redirect(`/groups/${group.id}`);
}

export type JoinOutcome =
  | { status: "ok"; groupId: string }
  | { status: "not-found" }
  | { status: "already"; groupId: string }
  | { status: "wrong-password" }
  | { status: "error"; message: string };

/**
 * Join a group by its invite code, optionally checking a password (docs/BACKLOG.md, Milestone 5).
 * Propagates every game the group already has assigned into the new member's own tracked-games
 * list, so joining a group with games already set up immediately shares stats both ways — the
 * same propagation `assignGameToGroup` does when a game is added after the fact.
 */
export async function joinGroupByCode(code: string, password: string): Promise<JoinOutcome> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Sign in to join a group." };

  const group = (await prisma.group.findUnique({
    where: { inviteCode: code },
    include: { groupGames: { select: { gameId: true } } },
  })) as { id: string; passwordHash: string | null; groupGames: Array<{ gameId: string }> } | null;
  if (!group) return { status: "not-found" };

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  });
  if (existing) return { status: "already", groupId: group.id };

  if (group.passwordHash && !verifyPassword(password, group.passwordHash)) {
    return { status: "wrong-password" };
  }

  await prisma.groupMember.create({
    data: { groupId: group.id, userId: session.user.id, role: "member" },
  });

  await Promise.all(
    group.groupGames.map((gg) =>
      prisma.userGame.upsert({
        where: { userId_gameId: { userId: session.user!.id, gameId: gg.gameId } },
        update: {},
        create: { userId: session.user!.id, gameId: gg.gameId },
      }),
    ),
  );

  revalidateGroup(group.id);
  revalidatePath("/");
  revalidatePath("/games");
  revalidatePath("/stats");
  return { status: "ok", groupId: group.id };
}

/**
 * Owner-only: permanently delete a group. `GroupMember`/`GroupGame` rows are cascaded away at the
 * schema level (`onDelete: Cascade` in prisma/schema.prisma); a member's own `UserGame` rows and
 * their `GameResult` history are untouched — deleting a group only removes the shared-assignment
 * layer on top, never anyone's personal tracking or past results.
 */
export async function deleteGroup(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in first.");

  const groupId = String(formData.get("groupId") ?? "");
  await requireRole(groupId, session.user.id, ["owner"]);

  await prisma.group.delete({ where: { id: groupId } });

  revalidatePath("/groups");
  redirect("/groups");
}

/** Owner-only: set, change, or clear (empty input) the group's join password. */
export async function resetGroupPassword(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in first.");

  const groupId = String(formData.get("groupId") ?? "");
  await requireRole(groupId, session.user.id, ["owner"]);

  const password = String(formData.get("password") ?? "").trim();
  await prisma.group.update({
    where: { id: groupId },
    data: { passwordHash: password ? hashPassword(password) : null },
  });

  revalidateGroup(groupId);
}

/**
 * Owner/admin: assign a game to the group. Propagates it to every *current* member's UserGame
 * list right away (the schema comment on GroupGame has said this should happen since Milestone 1)
 * — a member who joins later gets the group's current games via `joinGroupByCode` instead.
 */
export async function assignGameToGroup(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in first.");

  const groupId = String(formData.get("groupId") ?? "");
  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) throw new Error("Pick a game to assign.");
  await requireRole(groupId, session.user.id, ADMIN_ROLES);

  await prisma.groupGame.upsert({
    where: { groupId_gameId: { groupId, gameId } },
    update: {},
    create: { groupId, gameId },
  });

  const members = await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } });
  await Promise.all(
    members.map((member) =>
      prisma.userGame.upsert({
        where: { userId_gameId: { userId: member.userId, gameId } },
        update: {},
        create: { userId: member.userId, gameId },
      }),
    ),
  );

  revalidateGroup(groupId);
  revalidatePath("/");
  revalidatePath("/games");
  revalidatePath("/stats");
}

/**
 * Owner/admin: un-assign a game from the group. Only removes the group's own GroupGame row —
 * never touches a member's personal UserGame row or their GameResult history (same "hide, don't
 * delete" rule as untracking a game yourself; see docs/BACKLOG.md's note on this issue).
 */
export async function removeGameFromGroup(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in first.");

  const groupId = String(formData.get("groupId") ?? "");
  const gameId = String(formData.get("gameId") ?? "");
  await requireRole(groupId, session.user.id, ADMIN_ROLES);

  await prisma.groupGame.deleteMany({ where: { groupId, gameId } });

  revalidateGroup(groupId);
}

/** Owner-only: promote/demote a member between "member" and "admin". The owner role can't be reassigned here. */
export async function updateMemberRole(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in first.");

  const groupId = String(formData.get("groupId") ?? "");
  const targetUserId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (role !== "member" && role !== "admin") throw new Error("Invalid role.");

  await requireRole(groupId, session.user.id, ["owner"]);

  const target = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
  if (!target || target.role === "owner") {
    throw new Error("Can't change that member's role.");
  }

  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: targetUserId } },
    data: { role },
  });

  revalidateGroup(groupId);
}

/** Leave a group. The owner can't leave — transfer ownership isn't built yet, so they'd orphan it. */
export async function leaveGroup(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in first.");

  const groupId = String(formData.get("groupId") ?? "");
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!membership) return;
  if (membership.role === "owner") {
    throw new Error("The group owner can't leave yet — that's a fast-follow (see docs/BACKLOG.md).");
  }

  await prisma.groupMember.deleteMany({ where: { groupId, userId: session.user.id } });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  redirect("/groups");
}

/**
 * Toggle an emoji reaction on a group member's game result (docs/BACKLOG.md, Milestone 5 —
 * "Group emoji reactions"). One click adds it, the next removes it. Scoped to the group so a
 * reaction is only possible on a result that's actually visible in that group's feed: the result
 * must belong to a fellow member, for a game the group has assigned.
 */
export async function toggleReaction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in first.");

  const groupId = String(formData.get("groupId") ?? "");
  const gameResultId = String(formData.get("gameResultId") ?? "");
  const emoji = String(formData.get("emoji") ?? "");
  if (!isReactionEmoji(emoji)) throw new Error("Not a supported reaction.");

  await requireRole(groupId, session.user.id, ["owner", "admin", "member"]);

  const result = await prisma.gameResult.findUnique({ where: { id: gameResultId } });
  if (!result) throw new Error("That result no longer exists.");

  const [resultUserIsMember, gameIsAssigned] = await Promise.all([
    prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: result.userId } },
    }),
    prisma.groupGame.findUnique({
      where: { groupId_gameId: { groupId, gameId: result.gameId } },
    }),
  ]);
  if (!resultUserIsMember || !gameIsAssigned) {
    throw new Error("That result isn't part of this group's feed.");
  }

  const existing = await prisma.reaction.findUnique({
    where: {
      gameResultId_userId_emoji: { gameResultId, userId: session.user.id, emoji },
    },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({
      data: { gameResultId, userId: session.user.id, emoji },
    });
  }

  revalidatePath(`/groups/${groupId}`);
}
