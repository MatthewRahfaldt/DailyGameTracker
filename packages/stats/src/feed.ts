import type { Game } from "@dgt/types";
import type { DateString } from "./dates";

/** The person a feed item belongs to. */
export interface FeedActor {
  id: string;
  name: string;
  image: string | null;
}

/** One game played by one person on one day, as rendered in the feed. */
export interface FeedItem {
  id: string;
  actor: FeedActor;
  game: Game;
  playedDate: DateString;
  guesses: number | null;
  won: boolean | null;
}

/** Feed items bucketed under a single day. */
export interface FeedDay {
  date: DateString;
  items: FeedItem[];
}

/**
 * Hash a user id to a stable non-negative int, so each person's generated history
 * differs but never changes between renders. FNV-1a — small and good enough for fixtures.
 */
export function seedFrom(userId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Sort newest first and drop anything before `since` (inclusive).
 * Same-day ties break by actor id then game name so the order is stable across renders.
 */
export function mergeFeed(items: FeedItem[], since: DateString): FeedItem[] {
  return items
    .filter((i) => i.playedDate >= since)
    .sort((a, b) => {
      if (a.playedDate !== b.playedDate) return a.playedDate < b.playedDate ? 1 : -1;
      if (a.actor.id !== b.actor.id) return a.actor.id < b.actor.id ? -1 : 1;
      return a.game.name < b.game.name ? -1 : 1;
    });
}

/** Bucket an already-sorted feed into days, preserving the incoming order. */
export function groupByDay(items: FeedItem[]): FeedDay[] {
  const days: FeedDay[] = [];
  for (const item of items) {
    const last = days[days.length - 1];
    if (last && last.date === item.playedDate) last.items.push(item);
    else days.push({ date: item.playedDate, items: [item] });
  }
  return days;
}

/** You may view your own profile, or one belonging to someone you follow. */
export function canViewProfile(
  viewerId: string,
  targetId: string,
  followingIds: string[],
): boolean {
  return viewerId === targetId || followingIds.includes(targetId);
}
