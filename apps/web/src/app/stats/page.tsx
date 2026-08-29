import Link from "next/link";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { GameStatsTable, HeadlineStats } from "@/components/StatsSummary";
import { getStatsView } from "@/lib/demo-data";

// Dummy data is generated relative to "today", so don't let Next freeze it at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Stats — Daily Game Tracker",
};

export default async function StatsPage() {
  const { user, games, days, summary, stats, range, isDemo } = await getStatsView();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <Link href="/" className="text-sm text-black/60 underline dark:text-white/60">
          ← Back to paste box
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Stats</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {range.start} → {range.end} · all dates are UTC calendar days
          </p>
        </div>

        {isDemo && (
          <p
            role="status"
            className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
          >
            <strong>Demo data.</strong> Showing generated results for {user.name} — nothing here
            is saved or real. This page will be gated behind sign-in and load the signed-in
            user&apos;s own results once auth and the database land (Milestone 1/3).
          </p>
        )}
      </header>

      <HeadlineStats summary={summary} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Activity</h2>
        <CalendarHeatmap days={days} games={games} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Per-game</h2>
        <GameStatsTable stats={stats} games={games} />
      </section>
    </main>
  );
}
