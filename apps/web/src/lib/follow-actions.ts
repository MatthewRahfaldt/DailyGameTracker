"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type FollowOutcome = { status: "ok" | "already" | "self" | "not-found" };

/**
 * Follow the user owning `code`. Called from the confirm button on /follow/[code] —
 * never from a GET, so that a link preview or prefetch cannot follow on someone's behalf.
 */
export async function followByCode(code: string): Promise<FollowOutcome> {
  const session = await auth();
  if (!session?.user?.id) return { status: "not-found" };

  const target = await prisma.user.findUnique({
    where: { followCode: code },
    select: { id: true },
  });
  if (!target) return { status: "not-found" };
  if (target.id === session.user.id) return { status: "self" };

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: session.user.id, followingId: target.id },
    },
  });
  if (existing) return { status: "already" };

  await prisma.follow.create({
    data: { followerId: session.user.id, followingId: target.id },
  });

  revalidatePath("/feed");
  return { status: "ok" };
}

/** Stop following someone. No-op if the row is already gone. */
export async function unfollow(targetId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId: targetId },
  });

  revalidatePath("/feed");
}
