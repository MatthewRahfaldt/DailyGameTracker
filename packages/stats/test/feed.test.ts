import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canViewProfile,
  groupByDay,
  mergeFeed,
  seedFrom,
  type FeedItem,
} from "../src/feed";

const GAME = { id: "game-wordle", slug: "wordle", name: "Wordle", parserKey: "wordle" };

function item(actorId: string, playedDate: string, gameName = "Wordle"): FeedItem {
  return {
    id: `${actorId}-${gameName}-${playedDate}`,
    actor: { id: actorId, name: actorId, image: null },
    game: { ...GAME, name: gameName },
    playedDate,
    summary: {
      resultId: `${actorId}-${gameName}-${playedDate}`,
      gameId: GAME.id,
      label: gameName.toUpperCase(),
      value: "3",
      suffix: "/6",
      outcome: "win",
      grid: [],
    },
  };
}

test("seedFrom is deterministic and differs between users", () => {
  assert.equal(seedFrom("user-a"), seedFrom("user-a"));
  assert.notEqual(seedFrom("user-a"), seedFrom("user-b"));
  assert.ok(Number.isInteger(seedFrom("user-a")));
  assert.ok(seedFrom("user-a") >= 0);
});

test("mergeFeed sorts newest first across users", () => {
  const merged = mergeFeed(
    [item("a", "2026-09-01"), item("b", "2026-09-03"), item("a", "2026-09-02")],
    "2026-01-01",
  );
  assert.deepEqual(merged.map((i) => i.playedDate), ["2026-09-03", "2026-09-02", "2026-09-01"]);
});

test("mergeFeed drops items before the since date, inclusive of the boundary", () => {
  const merged = mergeFeed(
    [item("a", "2026-08-30"), item("a", "2026-08-31"), item("a", "2026-09-01")],
    "2026-08-31",
  );
  assert.deepEqual(merged.map((i) => i.playedDate), ["2026-09-01", "2026-08-31"]);
});

test("mergeFeed breaks same-day ties stably by actor then game", () => {
  const merged = mergeFeed(
    [
      item("zoe", "2026-09-01", "Wordle"),
      item("adam", "2026-09-01", "Nerdle"),
      item("adam", "2026-09-01", "Connections"),
    ],
    "2026-01-01",
  );
  assert.deepEqual(
    merged.map((i) => `${i.actor.id}/${i.game.name}`),
    ["adam/Connections", "adam/Nerdle", "zoe/Wordle"],
  );
});

test("groupByDay buckets items and preserves order", () => {
  const days = groupByDay(
    mergeFeed([item("a", "2026-09-01"), item("b", "2026-09-02"), item("b", "2026-09-01", "Nerdle")], "2026-01-01"),
  );
  assert.deepEqual(days.map((d) => d.date), ["2026-09-02", "2026-09-01"]);
  assert.equal(days[1].items.length, 2);
});

test("groupByDay returns an empty array for no items", () => {
  assert.deepEqual(groupByDay([]), []);
});

test("canViewProfile allows self and followed users only", () => {
  assert.equal(canViewProfile("me", "me", []), true);
  assert.equal(canViewProfile("me", "friend", ["friend"]), true);
  assert.equal(canViewProfile("me", "stranger", ["friend"]), false);
  assert.equal(canViewProfile("me", "stranger", []), false);
});
