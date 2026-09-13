import {
  type DateString,
  type FeedActor,
  type FeedItem,
  SAMPLE_GAMES,
  addDays,
  makeFixture,
  mergeFeed,
  seedFrom,
  todayUtc,
} from "@dgt/stats";
import { prisma } from "@/lib/prisma";

/** How far back the feed reaches. */
export const FEED_DAYS = 30;

export interface FeedView {
  viewer: { id: string };
  following: FeedActor[];
  items: FeedItem[];
  since: DateString;
  /** True while results are generated. Drives the demo banner. */
  isDemo: boolean;
}

/**
 * TEMPORARY RESULTS — the follow graph below is real, the results are generated.
 *
 * Nothing in the app writes a GameResult yet (PasteBox parses but never persists), so
 * there is nothing real to show. Once result-saving lands, replace the makeFixture block
 * with `loadFeedResults(viewerId, since)` from ./feed-queries and set isDemo: false.
 * The return type is identical, so no caller changes.
 */
export async function getFeedView(viewerId: string): Promise<FeedView> {
  const today = todayUtc();
  const since = addDays(today, -(FEED_DAYS - 1));

  // REAL: who this viewer follows.
  const follows = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: {
      following: { select: { id: true, name: true, image: true } },
    },
  });

  const following: FeedActor[] = follows.map((f) => ({
    id: f.following.id,
    name: f.following.name ?? "Someone",
    image: f.following.image ?? null,
  }));

  // GENERATED: stand-in history per followed user, stable per user id.
  const items: FeedItem[] = [];
  for (const actor of following) {
    const fixture = makeFixture({
      end: today,
      days: FEED_DAYS,
      seed: seedFrom(actor.id),
      userId: actor.id,
    });
    for (const result of fixture.results) {
      const game = SAMPLE_GAMES.find((g) => g.id === result.gameId);
      if (!game) continue;
      items.push({
        id: `${actor.id}-${result.id}`,
        actor,
        game,
        playedDate: result.playedDate,
        guesses: result.guesses ?? null,
        won: result.won ?? null,
      });
    }
  }

  return {
    viewer: { id: viewerId },
    following,
    items: mergeFeed(items, since),
    since,
    isDemo: true,
  };
}
