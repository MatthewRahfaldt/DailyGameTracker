import type { GameStatsView } from "@dgt/stats";

/** The expanded stats for one game: detail figures plus an optional distribution chart. */
export function GameStatsCard({ view }: { view: GameStatsView }) {
  const max = Math.max(1, ...(view.distribution ?? []).map((bar) => bar.count));

  return (
    <div className="mt-3 flex flex-col gap-4 rounded-lg bg-surface p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {view.details.map((entry) => (
          <div key={entry.label}>
            <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500">{entry.label}</dt>
            <dd className="font-mono text-lg text-stone-100">{entry.value}</dd>
          </div>
        ))}
      </dl>
      {view.distribution && (
        <ul className="flex flex-col gap-1 font-mono text-[11px] text-stone-400">
          {view.distribution.map((bar) => (
            <li key={bar.label} className="flex items-center gap-2">
              <span className="w-3 text-right">{bar.label}</span>
              <span className="flex-1">
                <span
                  className={`block h-2.5 rounded-sm ${bar.loss ? "bg-red-400" : "bg-green-400"}`}
                  style={{ width: `${Math.max(2, (bar.count / max) * 100)}%` }}
                />
              </span>
              <span className="w-6 text-right">{bar.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
