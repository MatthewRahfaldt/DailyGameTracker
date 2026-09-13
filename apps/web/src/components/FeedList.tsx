import Link from "next/link";
import { type FeedItem, formatLongDate, groupByDay } from "@dgt/stats";

/** Renders feed items grouped under day headings. Assumes items are already sorted. */
export function FeedList({ items }: { items: FeedItem[] }) {
  const days = groupByDay(items);

  if (days.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        Nothing in the last 30 days from the people you follow.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <section key={day.date} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-black/60 dark:text-white/60">
            {formatLongDate(day.date)}
          </h2>
          <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
            {day.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span>
                  <Link href={`/u/${item.actor.id}`} className="font-medium underline">
                    {item.actor.name}
                  </Link>{" "}
                  played {item.game.name}
                </span>
                <span className="font-mono text-black/60 dark:text-white/60">
                  {item.won === false ? "X/6" : item.guesses ? `${item.guesses}/6` : "—"}
                  {item.won ? " ✓" : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
