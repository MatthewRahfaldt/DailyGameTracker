import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule } from "../../src/games";
import { wordleModule } from "../../src/games/wordle";
import { TODAY, detailValue, game, result } from "./helpers";

const wordle = game("wordle", "Wordle");
const grid = ["⬛🟨⬛⬛⬛", "🟩🟩🟩🟩🟩"];
const data = { puzzleNumber: 1234, hardMode: false, grid };

test("registry returns the Wordle module", () => {
  assert.equal(getGameModule("wordle"), wordleModule);
});

test("a win shows guesses out of 6 with the grid", () => {
  const summary = wordleModule.summarize(
    result("wordle", { playedDate: TODAY, won: true, guesses: 2, parsedData: data }),
    wordle,
  );
  assert.equal(summary.label, "WORDLE");
  assert.equal(summary.value, "2");
  assert.equal(summary.suffix, "/6");
  assert.equal(summary.outcome, "win");
  assert.deepEqual(summary.grid, grid);
});

test("a loss shows X/6", () => {
  const summary = wordleModule.summarize(
    result("wordle", { playedDate: TODAY, won: false, parsedData: data }),
    wordle,
  );
  assert.equal(summary.value, "X");
  assert.equal(summary.suffix, "/6");
  assert.equal(summary.outcome, "loss");
});

test("unreadable parsedData falls back to the generic card", () => {
  const summary = wordleModule.summarize(
    result("wordle", { playedDate: TODAY, won: true, guesses: 3, parsedData: { grid: "nope" } }),
    wordle,
  );
  assert.equal(summary.value, "✓");
  assert.deepEqual(summary.grid, []);
});

test("stats average winning guesses, win rate and distribution", () => {
  const view = wordleModule.stats(
    [
      result("wordle", { playedDate: "2026-09-12", won: true, guesses: 3 }),
      result("wordle", { playedDate: "2026-09-13", won: true, guesses: 5 }),
      result("wordle", { playedDate: "2026-09-14", won: false }),
    ],
    "game-wordle",
    TODAY,
  );
  assert.equal(view.played, 3);
  assert.equal(view.currentStreak, 3);
  assert.equal(view.line, "4.0 avg");
  assert.equal(detailValue(view, "Win %"), "67%");
  assert.equal(detailValue(view, "Avg guesses"), "4.0");
  assert.equal(view.rankValue, 4);
  const counts = Object.fromEntries((view.distribution ?? []).map((bar) => [bar.label, bar.count]));
  assert.deepEqual(counts, { "1": 0, "2": 0, "3": 1, "4": 0, "5": 1, "6": 0, X: 1 });
  assert.equal(view.distribution?.at(-1)?.loss, true);
});

test("stats with no wins have no rank value", () => {
  const view = wordleModule.stats(
    [result("wordle", { playedDate: TODAY, won: false })],
    "game-wordle",
    TODAY,
  );
  assert.equal(view.line, "1 played");
  assert.equal(view.rankValue, null);
});
