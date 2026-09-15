import { makeFixture, todayUtc } from "@dgt/stats";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadStatsInputs } from "@/lib/stats-queries";
import { type StatsPageView, buildStatsPageView } from "@/lib/stats-view";

export interface MyStats {
  view: StatsPageView;
  /** True for generated sample data (signed out, or a stale session). Drives the notice. */
  isDemo: boolean;
}

/**
 * Signed in → the real thing. Signed out (or a session pointing at a deleted user) → generated
 * sample data, so /stats doubles as a preview of what signing in gets you.
 */
export async function getMyStats(today: string = todayUtc()): Promise<MyStats> {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
    if (user) {
      const { games, results } = await loadStatsInputs(user.id, today);
      return { view: buildStatsPageView(results, games, today), isDemo: false };
    }
  }

  const { games, results } = makeFixture({ end: today });
  return { view: buildStatsPageView(results, games, today), isDemo: true };
}
