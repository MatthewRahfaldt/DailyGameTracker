import { test } from "node:test";
import assert from "node:assert/strict";
import type { Game, GameResult } from "@dgt/types";
import { buildStandings } from "../src/groupStats";

const TODAY = "2026-09-13";

function game(parserKey: string): Game {
  return { id: parserKey, slug: parserKey, name: parserKey, parserKey, url: null };
}

function result(
  userId: string,
  gameId: string,
  playedDate: string,
  fields: Partial<GameResult> = {},
): GameResult {
  return {
    id: `${userId}-${gameId}-${playedDate}`,
    userId,
    gameId,
    playedDate,
    guesses: null,
    won: null,
    rawText: "",
    parsedData: null,
    ...fields,
  };
}

function member(id: string, results: GameResult[]) {
  return { actor: { id, name: id, image: null }, results };
}

const geo = (score: number) => ({
  parsedData: { date: "September 13th", score, maxScore: 1000, correct: 3, grid: ["🟡🟡🔴"] },
});

const ids = (standings: ReturnType<typeof buildStandings>) => standings.map((s) => s.actor.id);

test("buildStandings drops members with no results for the game", () => {
  const standings = buildStandings(
    [
      member("a", [result("a", "wordle", TODAY, { won: true, guesses: 3 })]),
      member("b", [result("b", "connections", TODAY, { won: true })]),
    ],
    game("wordle"),
    TODAY,
  );
  assert.deepEqual(ids(standings), ["a"]);
});

test("Wordle ranks by average guesses, lower first, over a longer streak", () => {
  const standings = buildStandings(
    [
      member("slow", [
        result("slow", "wordle", "2026-09-11", { won: true, guesses: 5 }),
        result("slow", "wordle", "2026-09-12", { won: true, guesses: 5 }),
        result("slow", "wordle", "2026-09-13", { won: true, guesses: 5 }),
      ]),
      member("fast", [result("fast", "wordle", TODAY, { won: true, guesses: 2 })]),
    ],
    game("wordle"),
    TODAY,
  );
  assert.deepEqual(ids(standings), ["fast", "slow"]);
  assert.equal(standings[0].view.line, "2.0 avg");
});

test("GeoSports ranks by average score, higher first", () => {
  const standings = buildStandings(
    [
      member("low", [result("low", "geosports", TODAY, geo(600))]),
      member("high", [result("high", "geosports", TODAY, geo(900))]),
    ],
    game("geosports"),
    TODAY,
  );
  assert.deepEqual(ids(standings), ["high", "low"]);
});

test("members without a rank value sort after everyone with one", () => {
  const standings = buildStandings(
    [
      member("only-losses", [result("only-losses", "wordle", TODAY, { won: false })]),
      member("winner", [result("winner", "wordle", TODAY, { won: true, guesses: 6 })]),
    ],
    game("wordle"),
    TODAY,
  );
  assert.deepEqual(ids(standings), ["winner", "only-losses"]);
});

test("equal metrics break by current streak", () => {
  const standings = buildStandings(
    [
      member("once", [result("once", "wordle", TODAY, { won: true, guesses: 3 })]),
      member("streaky", [
        result("streaky", "wordle", "2026-09-12", { won: true, guesses: 3 }),
        result("streaky", "wordle", "2026-09-13", { won: true, guesses: 3 }),
      ]),
    ],
    game("wordle"),
    TODAY,
  );
  assert.deepEqual(ids(standings), ["streaky", "once"]);
});

test("equal metrics and streaks break by games played", () => {
  const standings = buildStandings(
    [
      member("single", [result("single", "wordle", TODAY, { won: true, guesses: 3 })]),
      member("twice", [
        result("twice", "wordle", "2026-09-01", { won: true, guesses: 3 }),
        result("twice", "wordle", "2026-09-13", { won: true, guesses: 3 }),
      ]),
    ],
    game("wordle"),
    TODAY,
  );
  assert.deepEqual(ids(standings), ["twice", "single"]);
});

test("buildStandings returns an empty array for no members", () => {
  assert.deepEqual(buildStandings([], game("wordle"), TODAY), []);
});
