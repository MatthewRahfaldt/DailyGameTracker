import Link from "next/link";
import { formatLongDate, groupByDay, type DateString } from "@dgt/stats";
import { REACTION_EMOJI } from "@dgt/types";
import { GameLink } from "@/components/GameLink";
import { toggleReaction } from "@/app/groups/actions";
import type { GroupFeedItem } from "@/lib/group-queries";

/**
 * `groupByDay` (@dgt/stats) is typed generically over the base `FeedItem` shape, so its return
 * loses the `reactions` field that `GroupFeedItem` adds — the cast below recovers it. Safe: the
 * function only filters/sorts/buckets, it never drops or rewrites fields on the items it's given.
 */
function groupGroupFeedByDay(items: GroupFeedItem[]): Array<{ date: DateString; items: GroupFeedItem[] }> {
  return groupByDay(items) as unknown as Array<{ date: DateString; items: GroupFeedItem[] }>;
}

/**
 * A group's feed, with emoji reactions (docs/BACKLOG.md, Milestone 5 — "Group emoji reactions").
 * Same day-bucketed layout as the personal FeedList, plus a reaction bar under each item: one
 * small form per emoji, each just a plain Server Action submit — no client JS needed, same as the
 * track/untrack buttons on /games. Clicking a reaction you've already made removes it (see
 * `toggleReaction`).
 */
export function GroupFeedList({ groupId, items }: { groupId: string; items: GroupFeedItem[] }) {
  const days = groupGroupFeedByDay(items);

  if (days.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        Nothing in the last 30 days for this group&apos;s assigned games yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <section key={day.date} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-black/60 dark:text-white/60">
            {formatLongDate(day.date)}
          </h2>
          <ul className="flex flex-col gap-3">
            {day.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-md border border-black/10 p-3 text-sm dark:border-white/20"
              >
                <div className="flex items-center justify-between gap-4">
                  <span>
                    <Link href={`/u/${item.actor.id}`} className="font-medium underline">
                      {item.actor.name}
                    </Link>{" "}
                    played <GameLink name={item.game.name} url={item.game.url} />
                  </span>
                  <span className="text-black/60 dark:text-white/60">
                    {item.won === true
                      ? item.guesses != null
                        ? `Won in ${item.guesses}`
                        : "Won"
                      : item.won === false
                        ? "Lost"
                        : "Played"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {REACTION_EMOJI.map((emoji) => {
                    const summary = item.reactions.find((r) => r.emoji === emoji);
                    return (
                      <form key={emoji} action={toggleReaction}>
                        <input type="hidden" name="groupId" value={groupId} />
                        <input type="hidden" name="gameResultId" value={item.id} />
                        <input type="hidden" name="emoji" value={emoji} />
                        <button
                          type="submit"
                          className={
                            summary?.reactedByMe
                              ? "rounded-full border border-black/20 bg-black/10 px-2 py-0.5 text-xs dark:border-white/30 dark:bg-white/15"
                              : "rounded-full border border-black/10 px-2 py-0.5 text-xs opacity-60 transition-opacity hover:opacity-100 dark:border-white/20"
                          }
                        >
                          {emoji}
                          {summary && summary.count > 0 ? ` ${summary.count}` : ""}
                        </button>
                      </form>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
