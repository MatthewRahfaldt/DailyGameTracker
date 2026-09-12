import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GameLink } from "@/components/GameLink";
import { toggleGameTracking } from "./actions";

export const metadata = {
  title: "Your games — Daily Game Tracker",
};

/**
 * "Assign games to yourself" (docs/BACKLOG.md, Milestone 3). Lists every registered game with a
 * track/untrack toggle. Pasting a result already auto-tracks a game the first time (see
 * `saveGameResult`), so this page's main job is the other half — untracking one, or turning one
 * on before you've ever pasted a result for it.
 */
export default async function GamesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const [games, userGames] = await Promise.all([
    prisma.game.findMany({ orderBy: { name: "asc" } }),
    prisma.userGame.findMany({ where: { userId: session.user.id } }),
  ]);
  const trackedGameIds = new Set(userGames.map((userGame) => userGame.gameId));

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-16">
      <Link
        href="/"
        className="self-start text-sm text-black/60 transition-opacity hover:opacity-80 dark:text-white/60"
      >
        ← Back to home
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Your games</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Toggle which daily games show up in your Today checklist and stats. Pasting a result
          for an untracked game tracks it automatically, so this is really for turning one off —
          or on before you&apos;ve played it for the first time.
        </p>
      </div>

      {games.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          No games are set up on the server yet — someone needs to run{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">npm run db:seed</code>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {games.map((game) => {
            const tracked = trackedGameIds.has(game.id);
            return (
              <li
                key={game.id}
                className="flex items-center justify-between gap-3 rounded-md border border-black/10 p-3 text-sm dark:border-white/20"
              >
                <GameLink name={game.name} url={game.url} />
                <form action={toggleGameTracking}>
                  <input type="hidden" name="gameId" value={game.id} />
                  <input type="hidden" name="tracked" value={tracked ? "1" : "0"} />
                  <button
                    type="submit"
                    className={
                      tracked
                        ? "rounded-md border border-black/10 px-3 py-1.5 font-medium transition-opacity hover:opacity-80 dark:border-white/20"
                        : "rounded-md bg-foreground px-3 py-1.5 font-medium text-background transition-opacity hover:opacity-90"
                    }
                  >
                    {tracked ? "Untrack" : "Track"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
