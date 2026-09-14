import { test } from "node:test";
import assert from "node:assert/strict";
import type { GameResult } from "@dgt/types";
import { buildStandings } from "../src/groupStats";

function result(userId: string, gameId: string, playedDate: string, won: boolean | null, guesses: number | null = null): GameResult {
  return {
    id: `${userId}-${gameId}-${playedDate}`,
    userId,
    gameId,
    playedDate,
    guesses,
    won,
    rawText: "",
    parsedData: null,
  };
}

const TODAY = "2026-09-13";

test("buildStandings drops members with no results for the game", () => {
  const standings = buildStandings(
    [
      { actor: { id: "a", name: "A", image: null }, results: [result("a", "wordle", "2026-09-13", true)] },
      { actor: { id: "b", name: "B", image: null }, results: [result("b", "connections", "2026-09-13", true)] },
    ],
    "wordle",
    TODAY,
  );
  assert.deepEqual(standings.map((s) => s.actor.id), ["a"]);
});

test("buildStandings ranks by current streak first", () => {
  const standings = buildStandings(
    [
      {
        actor: { id: "short-streak", name: "Short", image: null },
        results: [result("short-streak", "wordle", "2026-09-13", true)],
      },
      {
        actor: { id: "long-streak", name: "Long", image: null },
        results: [
          result("long-streak", "wordle", "2026-09-11", true),
          result("long-streak", "wordle", "2026-09-12", true),
          result("long-streak", "wordle", "2026-09-13", true),
        ],
      },
    ],
    "wordle",
    TODAY,
  );
  assert.deepEqual(standings.map((s) => s.actor.id), ["long-streak", "short-streak"]);
});

test("buildStandings breaks streak ties by win rate, treating no win/loss data as lowest", () => {
  const standings = buildStandings(
    [
      {
        actor: { id: "no-wl", name: "Score game", image: null },
        results: [result("no-wl", "geosports", "2026-09-13", null)],
      },
      {
        actor: { id: "high-wr", name: "High winrate", image: null },
        results: [result("high-wr", "geosports", "2026-09-13", true)],
      },
    ],
    "geosports",
    TODAY,
  );
  assert.deepEqual(standings.map((s) => s.actor.id), ["high-wr", "no-wl"]);
});

test("buildStandings final tiebreaker is games played", () => {
  const standings = buildStandings(
    [
      {
        actor: { id: "played-once", name: "Once", image: null },
        results: [result("played-once", "wordle", "2026-09-13", true)],
      },
      {
        actor: { id: "played-twice", name: "Twice", image: null },
        // The 2026-09-01 win is too far back to chain into a streak, so both members land at a
        // 1-day current streak and a 100% win rate — isolating "games played" as the tiebreaker.
        results: [
          result("played-twice", "wordle", "2026-09-01", true),
          result("played-twice", "wordle", "2026-09-13", true),
        ],
      },
    ],
    "wordle",
    TODAY,
  );
  assert.deepEqual(standings.map((s) => s.actor.id), ["played-twice", "played-once"]);
});

test("buildStandings returns an empty array for no members", () => {
  assert.deepEqual(buildStandings([], "wordle", TODAY), []);
});
