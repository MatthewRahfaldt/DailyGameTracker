"use client";

import { useState } from "react";
import {
  type HeatmapDay,
  formatLongDate,
  formatMonthShort,
  toWeeks,
} from "@dgt/stats";
import type { Game } from "@dgt/types";

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

/** Five buckets, GitHub-style: empty, then four intensities scaled by completion ratio. */
function cellClass(day: HeatmapDay | null): string {
  if (!day) return "bg-transparent";
  if (day.played === 0) return "bg-black/[.06] dark:bg-white/[.08]";
  if (day.ratio <= 0.34) return "bg-emerald-200 dark:bg-emerald-900";
  if (day.ratio <= 0.67) return "bg-emerald-400 dark:bg-emerald-700";
  if (day.ratio < 1) return "bg-emerald-500 dark:bg-emerald-500";
  return "bg-emerald-600 dark:bg-emerald-400";
}

export function CalendarHeatmap({ days, games }: { days: HeatmapDay[]; games: Game[] }) {
  const [selected, setSelected] = useState<HeatmapDay | null>(null);
  const weeks = toWeeks(days);
  const gameName = (gameId: string) => games.find((g) => g.id === gameId)?.name ?? gameId;

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          {/* Month labels sit above the first column of each new month. */}
          <div className="flex gap-[3px] pl-8 text-[10px] text-black/50 dark:text-white/50">
            {weeks.map((week, index) => {
              const first = week.find(Boolean);
              const previous = weeks[index - 1]?.find(Boolean);
              const isNewMonth =
                first &&
                (!previous || first.date.slice(0, 7) !== previous.date.slice(0, 7));
              return (
                <span key={index} className="w-[11px] shrink-0">
                  {isNewMonth ? formatMonthShort(first.date) : ""}
                </span>
              );
            })}
          </div>

          <div className="flex gap-[3px]">
            <div className="flex w-8 shrink-0 flex-col gap-[3px] text-[10px] leading-[11px] text-black/50 dark:text-white/50">
              {DAY_LABELS.map((label, index) => (
                <span key={index} className="h-[11px]">
                  {label}
                </span>
              ))}
            </div>

            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((day, dayIndex) =>
                  day ? (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelected(day)}
                      title={`${formatLongDate(day.date)} — ${day.played}/${day.assigned} played`}
                      aria-label={`${formatLongDate(day.date)}, ${day.played} of ${day.assigned} games played`}
                      className={`h-[11px] w-[11px] rounded-[2px] transition-transform hover:scale-125 ${cellClass(day)} ${
                        selected?.date === day.date
                          ? "ring-2 ring-black ring-offset-1 dark:ring-white dark:ring-offset-black"
                          : ""
                      }`}
                    />
                  ) : (
                    <span key={`pad-${weekIndex}-${dayIndex}`} className="h-[11px] w-[11px]" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-black/50 dark:text-white/50">
        <span>Less</span>
        {[0, 0.33, 0.66, 0.99, 1].map((ratio) => (
          <span
            key={ratio}
            className={`h-[11px] w-[11px] rounded-[2px] ${cellClass({
              date: "",
              assigned: 1,
              played: ratio === 0 ? 0 : 1,
              ratio,
              results: [],
            })}`}
          />
        ))}
        <span>More</span>
        <span className="ml-2">· UTC days</span>
      </div>

      <div className="min-h-[92px] rounded-md border border-black/10 p-4 dark:border-white/15">
        {selected ? (
          <>
            <p className="text-sm font-medium">{formatLongDate(selected.date)}</p>
            <p className="mt-1 text-xs text-black/60 dark:text-white/60">
              {selected.played} of {selected.assigned} tracked games played
            </p>
            {selected.results.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {selected.results.map((result) => (
                  <li key={result.id} className="flex justify-between gap-4">
                    <span>{gameName(result.gameId)}</span>
                    <span className="tabular-nums text-black/70 dark:text-white/70">
                      {result.won === false
                        ? "X/6"
                        : result.guesses != null
                          ? `${result.guesses}/6`
                          : "played"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-black/50 dark:text-white/50">Nothing played.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-black/50 dark:text-white/50">
            Select a day to see which games were played.
          </p>
        )}
      </div>
    </section>
  );
}
