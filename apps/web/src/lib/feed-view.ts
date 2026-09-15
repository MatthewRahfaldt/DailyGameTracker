import { type DateString, type FeedActor, type FeedItem, addDays, mergeFeed, todayUtc } from "@dgt/stats";
import { prisma } from "@/lib/prisma";
import { loadFeedResults } from "./feed-queries";

/** How far back the feed reaches. */
export const FEED_DAYS = 30;

export interface FeedView {
  viewer: { id: string };
  following: FeedActor[];
  items: FeedItem[];
  since: DateString;
}

/**
 * Assembles the signed-in viewer's feed: who they follow (real, from the Follow graph)
 * plus real `GameResult` rows for those people, via `loadFeedResults` (./feed-queries).
 */
export async function getFeedView(viewerId: string): Promise<FeedView> {
  const today = todayUtc();
  const since = addDays(today, -(FEED_DAYS - 1));

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

  const items = await loadFeedResults(viewerId, since);

  return {
    viewer: { id: viewerId },
    following,
    items: mergeFeed(items, since),
    since,
  };
}
