import { test } from "node:test";
import assert from "node:assert/strict";
import type { GameResult } from "@dgt/types";
import { computeAllStats, computeGameStats } from "../src/stats";

const TODAY = "2026-08-29";

function result(partial: Partial<GameResult> & { playedDate: string }): GameResult {
  return {
    id: `r-${partial.gameId ?? "wordle"}-${partial.playedDate}`,
    userId: "user-1",
    gameId: "wordle",
    guesses: 4,
    won: true,
    rawText: "",
    parsedData: null,
    ...partial,
  };
}

function run(dates: string[], gameId = "wordle"): GameResult[] {
  return dates.map((playedDate) => result({ playedDate, gameId }));
}

test("no results yields zeroed stats, not NaN", () => {
  const stats = computeGameStats([], "wordle", TODAY);
  assert.equal(stats.played, 0);
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.bestStreak, 0);
  assert.equal(stats.winRate, null);
  assert.equal(stats.averageGuesses, null);
  assert.equal(stats.lastPlayedDate, null);
});

test("a streak ending today counts through today", () => {
  const stats = computeGameStats(run(["2026-08-27", "2026-08-28", "2026-08-29"]), "wordle", TODAY);
  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.bestStreak, 3);
  assert.equal(stats.lastPlayedDate, "2026-08-29");
});

test("a streak ending yesterday is still alive — today isn't over yet", () => {
  const stats = computeGameStats(run(["2026-08-27", "2026-08-28"]), "wordle", TODAY);
  assert.equal(stats.currentStreak, 2);
});

test("a two-day gap breaks the current streak but not the best", () => {
  const stats = computeGameStats(
    run(["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-20"]),
    "wordle",
    TODAY,
  );
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.bestStreak, 4);
});

test("current streak counts only the trailing run, not the best one", () => {
  const stats = computeGameStats(
    run(["2026-07-01", "2026-07-02", "2026-07-03", "2026-08-28", "2026-08-29"]),
    "wordle",
    TODAY,
  );
  assert.equal(stats.currentStreak, 2);
  assert.equal(stats.bestStreak, 3);
});

test("streaks run across month and year boundaries", () => {
  const stats = computeGameStats(
    run(["2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02"]),
    "wordle",
    "2026-01-02",
  );
  assert.equal(stats.currentStreak, 4);
});

test("duplicate pastes for one day count once across every aggregate", () => {
  const results = [
    result({ playedDate: "2026-08-28" }),
    { ...result({ playedDate: "2026-08-28" }), id: "r-dupe" },
    result({ playedDate: "2026-08-29" }),
  ];
  const stats = computeGameStats(results, "wordle", TODAY);
  assert.equal(stats.played, 2);
  assert.equal(stats.currentStreak, 2);
  // Regression: wins used to count the raw rows (3) while played counted days (2),
  // pushing the win-rate denominator out of step with everything else.
  assert.equal(stats.wins, 2);
  assert.equal(stats.losses, 0);
  assert.equal(stats.winRate, 1);
});

test("a duplicate never makes wins exceed days played", () => {
  const results = [
    result({ playedDate: "2026-08-28", won: true, guesses: 3 }),
    { ...result({ playedDate: "2026-08-28", won: true, guesses: 3 }), id: "dupe-a" },
    { ...result({ playedDate: "2026-08-28", won: true, guesses: 3 }), id: "dupe-b" },
  ];
  const stats = computeGameStats(results, "wordle", TODAY);
  assert.equal(stats.played, 1);
  assert.ok(stats.wins <= stats.played, `wins ${stats.wins} > played ${stats.played}`);
  assert.equal(stats.averageGuesses, 3);
});

test("a game with no win/lose data reports null win rate, not 0%", () => {
  const stats = computeGameStats(
    [result({ playedDate: "2026-08-29", won: null, guesses: null })],
    "wordle",
    TODAY,
  );
  assert.equal(stats.played, 1);
  assert.equal(stats.winRate, null);
});

test("an untracked-but-listed game reports null rather than a 0% loss record", () => {
  const [connections] = computeAllStats([], ["connections"], TODAY);
  assert.equal(connections.played, 0);
  assert.equal(connections.winRate, null);
});

test("Prisma-style ISO timestamps streak the same as bare date strings", () => {
  const results = [
    result({ playedDate: "2026-08-28T00:00:00.000Z" }),
    result({ playedDate: "2026-08-29T00:00:00.000Z" }),
  ];
  assert.equal(computeGameStats(results, "wordle", TODAY).currentStreak, 2);
});

test("future-dated results do not prop up a dead streak", () => {
  const stats = computeGameStats(run(["2026-09-15"]), "wordle", TODAY);
  assert.equal(stats.currentStreak, 0);
});

test("other games' results are ignored", () => {
  const results = [...run(["2026-08-29"], "wordle"), ...run(["2026-08-29"], "nerdle")];
  assert.equal(computeGameStats(results, "wordle", TODAY).played, 1);
});

test("win rate and average guesses skip results that record neither", () => {
  const results = [
    result({ playedDate: "2026-08-26", won: true, guesses: 3 }),
    result({ playedDate: "2026-08-27", won: true, guesses: 5 }),
    result({ playedDate: "2026-08-28", won: false, guesses: null }),
    result({ playedDate: "2026-08-29", won: null, guesses: null }),
  ];
  const stats = computeGameStats(results, "wordle", TODAY);
  assert.equal(stats.wins, 2);
  assert.equal(stats.losses, 1);
  assert.equal(stats.winRate, 2 / 3);
  assert.equal(stats.averageGuesses, 4);
});

test("computeAllStats preserves the order of the tracked games", () => {
  const results = [...run(["2026-08-29"], "wordle"), ...run(["2026-08-29"], "nerdle")];
  const stats = computeAllStats(results, ["nerdle", "wordle", "connections"], TODAY);
  assert.deepEqual(
    stats.map((s) => s.gameId),
    ["nerdle", "wordle", "connections"],
  );
  assert.equal(stats[2].played, 0);
});
