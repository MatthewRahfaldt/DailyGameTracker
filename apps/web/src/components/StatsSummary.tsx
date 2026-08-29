import type { GameStats, HeatmapSummary } from "@dgt/stats";
import type { Game } from "@dgt/types";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-black/10 p-4 dark:border-white/15">
      <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-black/50 dark:text-white/50">{hint}</p>}
    </div>
  );
}

export function HeadlineStats({ summary }: { summary: HeatmapSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        label="Days active"
        value={String(summary.activeDays)}
        hint={`of ${summary.days} days`}
      />
      <Stat label="Games played" value={String(summary.totalPlays)} />
      <Stat
        label="Completion"
        value={`${Math.round(summary.completionRate * 100)}%`}
        hint="of all tracked games"
      />
      <Stat label="Perfect days" value={String(summary.perfectDays)} hint="every game played" />
    </div>
  );
}

export function GameStatsTable({ stats, games }: { stats: GameStats[]; games: Game[] }) {
  const gameName = (gameId: string) => games.find((g) => g.id === gameId)?.name ?? gameId;

  return (
    <div className="overflow-x-auto rounded-md border border-black/10 dark:border-white/15">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
          <tr className="border-b border-black/10 dark:border-white/15">
            <th className="p-3 font-medium">Game</th>
            <th className="p-3 font-medium">Played</th>
            <th className="p-3 font-medium">Streak</th>
            <th className="p-3 font-medium">Best</th>
            <th className="p-3 font-medium">Win rate</th>
            <th className="p-3 font-medium">Avg guesses</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => (
            <tr
              key={stat.gameId}
              className="border-b border-black/5 last:border-0 dark:border-white/10"
            >
              <td className="p-3 font-medium">{gameName(stat.gameId)}</td>
              <td className="p-3 tabular-nums">{stat.played}</td>
              <td className="p-3 tabular-nums">
                {stat.currentStreak > 0 ? `${stat.currentStreak} 🔥` : "—"}
              </td>
              <td className="p-3 tabular-nums">{stat.bestStreak}</td>
              <td className="p-3 tabular-nums">
                {stat.winRate == null ? "—" : `${Math.round(stat.winRate * 100)}%`}
              </td>
              <td className="p-3 tabular-nums">
                {stat.averageGuesses == null ? "—" : stat.averageGuesses.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
