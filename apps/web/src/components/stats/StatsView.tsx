import type { StatsPageView } from "@/lib/stats-view";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { GameStatsCard } from "./GameStatsCard";

/** Shared by /stats and /u/[id]: heatmap, then one expandable line per game. */
export function StatsView({ view }: { view: StatsPageView }) {
  return (
    <div className="flex flex-col gap-8">
      <ActivityHeatmap days={view.days} />
      {view.perGame.length === 0 ? (
        <p className="text-sm text-stone-500">No games tracked yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-900">
          {view.perGame.map(({ game, view: stats }) => (
            <li key={game.id}>
              <details className="py-3">
                <summary className="flex items-baseline justify-between gap-4">
                  <span className="text-sm text-stone-200">{game.name}</span>
                  <span className="font-mono text-sm text-green-400">
                    {stats.line}
                    {stats.currentStreak > 0 && <span className="text-stone-500"> · {stats.currentStreak}🔥</span>}
                  </span>
                </summary>
                <GameStatsCard view={stats} />
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
