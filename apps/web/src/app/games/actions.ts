"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Toggle whether the signed-in user tracks a game (docs/BACKLOG.md, Milestone 3 —
 * "Build 'assign games to yourself' UI").
 *
 * Untracking never deletes past `GameResult` rows — it only affects whether the game counts
 * toward the "Today" checklist (`TodayDashboard`) and the heatmap/stats denominator. See the
 * comment on `buildHeatmap` in packages/stats/src/heatmap.ts: results for a game you've
 * unassigned are ignored, not deleted, so your history comes back if you re-track it later.
 */
export async function toggleGameTracking(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const gameId = formData.get("gameId");
  const currentlyTracked = formData.get("tracked") === "1";
  if (typeof gameId !== "string" || gameId.length === 0) return;

  if (currentlyTracked) {
    // deleteMany (not delete) so double-clicking or a stale form doesn't throw on a row that's
    // already gone.
    await prisma.userGame.deleteMany({ where: { userId: session.user.id, gameId } });
  } else {
    await prisma.userGame.upsert({
      where: { userId_gameId: { userId: session.user.id, gameId } },
      update: {},
      create: { userId: session.user.id, gameId },
    });
  }

  revalidatePath("/games");
  revalidatePath("/");
  revalidatePath("/stats");
}
