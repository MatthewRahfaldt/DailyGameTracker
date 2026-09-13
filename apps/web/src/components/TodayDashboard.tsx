import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { todayInTimezone } from "@/lib/timezone";
import { GameLink } from "@/components/GameLink";

/**
 * "Today" checklist (docs/BACKLOG.md, Milestone 3 — "Build daily dashboard view"): each game the
 * signed-in user tracks, and whether they've played it yet today in their own timezone — the
 * same `todayInTimezone()` that `saveGameResult` uses to decide which day a paste counts toward,
 * so this always agrees with what actually got saved.
 *
 * Self-contained like `AuthStatus`: calls `auth()` itself and renders nothing when signed out,
 * rather than the homepage needing to know or care. The paste box above it still works
 * anonymously as a preview — there's just no "today" to track without an account.
 */
export async function TodayDashboard() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;

  const userGames = await prisma.userGame.findMany({
    where: { userId: user.id },
    include: { game: true },
    orderBy: { game: { name: "asc" } },
  });

  if (userGames.length === 0) {
    return (
      <section className="w-full max-w-xl rounded-md border border-dashed border-black/15 p-4 text-sm text-black/60 dark:border-white/20 dark:text-white/60">
        You&apos;re not tracking any games yet.{" "}
        <Link href="/games" className="underline">
          Pick some to track
        </Link>{" "}
        — or just paste a result above; that tracks it automatically.
      </section>
    );
  }

  const playedDate = new Date(todayInTimezone(user.timezone));
  const results = await prisma.gameResult.findMany({
    where: {
      userId: user.id,
      gameId: { in: userGames.map((userGame) => userGame.gameId) },
      playedDate,
    },
  });
  const resultByGameId = new Map(results.map((result) => [result.gameId, result]));

  return (
    <section className="flex w-full max-w-xl flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Today</h2>
        <Link href="/games" className="text-xs text-black/50 underline dark:text-white/50">
          Manage games
        </Link>
      </div>
      <ul className="flex flex-col rounded-md border border-black/10 dark:border-white/15">
        {userGames.map(({ game }) => {
          const result = resultByGameId.get(game.id);
          return (
            <li
              key={game.id}
              className="flex items-center justify-between gap-3 border-b border-black/5 p-3 text-sm last:border-0 dark:border-white/10"
            >
              <GameLink name={game.name} url={game.url} />
              <span
                className={
                  result ? "text-green-700 dark:text-green-400" : "text-black/40 dark:text-white/40"
                }
              >
                {result
                  ? result.won === true
                    ? result.guesses != null
                      ? `Won in ${result.guesses}`
                      : "Won"
                    : result.won === false
                      ? "Lost"
                      : "Played"
                  : "Not played yet"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
