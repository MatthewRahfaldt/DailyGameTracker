import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GameLink } from "@/components/GameLink";
import { Page } from "@/components/ui/Page";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/styles";
import { prisma } from "@/lib/prisma";
import { toggleGameTracking } from "./actions";

export const metadata = { title: "My games — Daily Game Tracker" };

/** Track/untrack games. Pasting a result already tracks its game, so this is mostly for turning one off. */
export default async function GamesPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const [games, userGames] = await Promise.all([
    prisma.game.findMany({ orderBy: { name: "asc" } }),
    prisma.userGame.findMany({ where: { userId: session.user.id } }),
  ]);
  const trackedGameIds = new Set(userGames.map((userGame) => userGame.gameId));

  return (
    <Page title="My games">
      <p className="text-sm text-stone-500">
        Tracked games show on Today and in Stats. Pasting a result tracks its game automatically.
      </p>
      {games.length === 0 ? (
        <p className="text-sm text-stone-500">
          No games are set up on the server yet — run <code className="font-mono">npm run db:seed</code>.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-900">
          {games.map((game) => {
            const tracked = trackedGameIds.has(game.id);
            return (
              <li key={game.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <GameLink name={game.name} url={game.url} />
                <form action={toggleGameTracking}>
                  <input type="hidden" name="gameId" value={game.id} />
                  <input type="hidden" name="tracked" value={tracked ? "1" : "0"} />
                  <button type="submit" className={tracked ? secondaryButtonClass : primaryButtonClass}>
                    {tracked ? "Untrack" : "Track"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
