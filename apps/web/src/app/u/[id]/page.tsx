import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  buildHeatmap,
  canViewProfile,
  computeAllStats,
  makeFixture,
  seedFrom,
  summarizeHeatmap,
  todayUtc,
  trailingYear,
} from "@dgt/stats";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { GameStatsTable, HeadlineStats } from "@/components/StatsSummary";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/u/${id}`)}`);
  }

  const follows = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });

  // 404 rather than 403: don't confirm whether this id exists to someone who can't see it.
  if (!canViewProfile(session.user.id, id, follows.map((f) => f.followingId))) notFound();

  const person = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!person) notFound();

  const today = todayUtc();
  const range = trailingYear(today);
  const { games, assignedGameIds, results } = makeFixture({ end: today, seed: seedFrom(id), userId: id });
  const days = buildHeatmap(results, assignedGameIds, range);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <Link href="/feed" className="text-sm text-black/60 underline dark:text-white/60">
          ← Back to feed
        </Link>
        <h1 className="text-2xl font-semibold">{person.name ?? "Player"}</h1>
        <p
          role="status"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
        >
          <strong>Demo results.</strong> Generated history — nothing in the app saves results yet.
        </p>
      </header>

      <HeadlineStats summary={summarizeHeatmap(days)} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Activity</h2>
        <CalendarHeatmap days={days} games={games} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Per-game</h2>
        <GameStatsTable stats={computeAllStats(results, assignedGameIds, today)} games={games} />
      </section>
    </main>
  );
}
