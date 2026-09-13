import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  buildHeatmap,
  canViewProfile,
  computeAllStats,
  summarizeHeatmap,
  todayUtc,
  trailingYear,
} from "@dgt/stats";
import type { Game } from "@dgt/types";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { GameStatsTable, HeadlineStats } from "@/components/StatsSummary";
import { loadUserResults } from "@/lib/feed-queries";

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

  const userGames = await prisma.userGame.findMany({
    where: { userId: id },
    include: { game: true },
  });
  const games: Game[] = userGames.map(({ game }) => ({
    id: game.id,
    slug: game.slug,
    name: game.name,
    parserKey: game.parserKey,
    url: game.url,
  }));
  const assignedGameIds = games.map((game) => game.id);

  const results = await loadUserResults(id, range);
  const days = buildHeatmap(results, assignedGameIds, range);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <Link href="/feed" className="text-sm text-black/60 underline dark:text-white/60">
          ← Back to feed
        </Link>
        <h1 className="text-2xl font-semibold">{person.name ?? "Player"}</h1>
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
