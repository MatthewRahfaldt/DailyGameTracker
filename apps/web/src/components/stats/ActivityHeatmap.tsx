"use client";

import { useState } from "react";
import { formatLongDate, formatMonthShort, toWeeks } from "@dgt/stats";
import { CardGrid, ResultCard } from "@/components/ui/ResultCard";
import type { ClientHeatmapDay } from "@/lib/stats-view";

function cellClass(day: ClientHeatmapDay): string {
  if (day.played === 0) return "bg-stone-900";
  if (day.ratio <= 0.34) return "bg-green-900";
  if (day.ratio <= 0.67) return "bg-green-700";
  if (day.ratio < 1) return "bg-green-500";
  return "bg-green-400";
}

const isDay = (day: ClientHeatmapDay | null): day is ClientHeatmapDay => day !== null;

/** Year heatmap; selecting a day shows that day's game cards underneath. */
export function ActivityHeatmap({ days }: { days: ClientHeatmapDay[] }) {
  const [selected, setSelected] = useState<ClientHeatmapDay | null>(null);
  const weeks = toWeeks(days);

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-[3px] font-mono text-[10px] text-stone-600">
            {weeks.map((week, index) => {
              const first = week.find(isDay);
              const previous = weeks[index - 1]?.find(isDay);
              const isNewMonth =
                first !== undefined && (!previous || first.date.slice(0, 7) !== previous.date.slice(0, 7));
              return (
                <span key={index} className="w-[11px] shrink-0">
                  {isNewMonth ? formatMonthShort(first.date) : ""}
                </span>
              );
            })}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((day, dayIndex) =>
                  day ? (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelected(day)}
                      title={`${formatLongDate(day.date)} — ${day.played}/${day.assigned}`}
                      aria-label={`${formatLongDate(day.date)}, ${day.played} of ${day.assigned} games played`}
                      className={`h-[11px] w-[11px] rounded-[2px] ${cellClass(day)} ${
                        selected?.date === day.date ? "ring-1 ring-yellow-400 ring-offset-1 ring-offset-stone-950" : ""
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

      {selected && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-stone-500">
            {formatLongDate(selected.date)} · {selected.played} / {selected.assigned}
          </p>
          {selected.cards.length > 0 ? (
            <CardGrid>
              {selected.cards.map((card) => (
                <ResultCard key={card.resultId} summary={card} />
              ))}
            </CardGrid>
          ) : (
            <p className="text-sm text-stone-600">Nothing played.</p>
          )}
        </div>
      )}
    </section>
  );
}
