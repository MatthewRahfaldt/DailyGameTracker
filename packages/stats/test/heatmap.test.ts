import { test } from "node:test";
import assert from "node:assert/strict";
import type { GameResult } from "@dgt/types";
import { buildHeatmap } from "../src/heatmap";
import { makeFixture } from "../src/fixtures";

const RANGE = { start: "2026-08-27", end: "2026-08-29" };

function result(gameId: string, playedDate: string, id = `${gameId}-${playedDate}`): GameResult {
  return {
    id,
    userId: "user-1",
    gameId,
    playedDate,
    guesses: 4,
    won: true,
    rawText: "",
    parsedData: null,
  };
}

test("every day in range gets a cell, including empty ones", () => {
  const days = buildHeatmap([], ["wordle"], RANGE);
  assert.deepEqual(
    days.map((d) => d.date),
    ["2026-08-27", "2026-08-28", "2026-08-29"],
  );
  assert.ok(days.every((d) => d.played === 0 && d.ratio === 0));
});

test("ratio reflects the fraction of tracked games played", () => {
  const results = [
    result("wordle", "2026-08-28"),
    result("wordle", "2026-08-29"),
    result("nerdle", "2026-08-29"),
  ];
  const days = buildHeatmap(results, ["wordle", "nerdle"], RANGE);
  assert.deepEqual(
    days.map((d) => d.ratio),
    [0, 0.5, 1],
  );
});

test("untracked games are excluded from both count and ratio", () => {
  const results = [result("wordle", "2026-08-29"), result("connections", "2026-08-29")];
  const day = buildHeatmap(results, ["wordle"], RANGE).at(-1)!;
  assert.equal(day.played, 1);
  assert.equal(day.ratio, 1);
  assert.equal(day.results.length, 1);
});

test("a duplicate paste counts once and cannot push ratio above 1", () => {
  const results = [
    result("wordle", "2026-08-29", "first"),
    result("wordle", "2026-08-29", "second"),
  ];
  const day = buildHeatmap(results, ["wordle"], RANGE).at(-1)!;
  assert.equal(day.played, 1);
  assert.equal(day.ratio, 1);
});

test("results outside the range are dropped", () => {
  const days = buildHeatmap([result("wordle", "2026-01-01")], ["wordle"], RANGE);
  assert.ok(days.every((d) => d.played === 0));
});

test("each cell carries its results for the click-through detail view", () => {
  const days = buildHeatmap([result("wordle", "2026-08-28")], ["wordle"], RANGE);
  assert.equal(days[1].results[0].id, "wordle-2026-08-28");
});

test("tracking no games yields zero ratios rather than a divide-by-zero", () => {
  const days = buildHeatmap([result("wordle", "2026-08-29")], [], RANGE);
  assert.ok(days.every((d) => d.ratio === 0 && Number.isFinite(d.ratio)));
});

test("the fixture fills a full year with a real spread of intensities", () => {
  const { results, assignedGameIds } = makeFixture({ end: "2026-08-29" });
  const days = buildHeatmap(results, assignedGameIds, {
    start: "2025-08-30",
    end: "2026-08-29",
  });

  assert.equal(days.length, 365);
  const ratios = new Set(days.map((d) => d.ratio));
  assert.ok(ratios.size > 2, "expected varied intensities, got " + [...ratios].join(","));
  assert.ok(days.some((d) => d.ratio === 0), "expected some empty days");
  assert.ok(days.some((d) => d.ratio === 1), "expected some complete days");
  assert.ok(days.every((d) => d.ratio >= 0 && d.ratio <= 1));
});

test("the fixture is deterministic for a given seed", () => {
  const a = makeFixture({ end: "2026-08-29" });
  const b = makeFixture({ end: "2026-08-29" });
  assert.equal(a.results.length, b.results.length);
  assert.deepEqual(a.results[0], b.results[0]);
  assert.notEqual(makeFixture({ end: "2026-08-29", seed: 7 }).results.length, -1);
});
