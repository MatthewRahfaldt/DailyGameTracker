import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule } from "../../src/games";
import { catfishingModule } from "../../src/games/catfishing";
import { TODAY, detailValue, game, result } from "./helpers";

const catfishing = game("catfishing", "Catfishing");
const grid = ["🐈🐈🐟🐈🐈", "🐈🐟🐈🐈🐟"];
const data = (correct: number) => ({ puzzleNumber: 797, correct, totalQuestions: 10, grid });

test("registry returns the Catfishing module", () => {
  assert.equal(getGameModule("catfishing"), catfishingModule);
});

test("a result shows correct out of total; a perfect run is a win", () => {
  const seven = catfishingModule.summarize(
    result("catfishing", { playedDate: TODAY, won: false, parsedData: data(7) }),
    catfishing,
  );
  assert.equal(seven.value, "7");
  assert.equal(seven.suffix, "/10");
  assert.equal(seven.outcome, "score");
  assert.deepEqual(seven.grid, grid);
  const ten = catfishingModule.summarize(
    result("catfishing", { playedDate: TODAY, won: true, parsedData: data(10) }),
    catfishing,
  );
  assert.equal(ten.outcome, "win");
});

test("unreadable data falls back to the generic card", () => {
  const summary = catfishingModule.summarize(
    result("catfishing", { playedDate: TODAY, won: true, parsedData: null }),
    catfishing,
  );
  assert.equal(summary.value, "✓");
});

test("stats average correct answers and rank higher first", () => {
  const view = catfishingModule.stats(
    [
      result("catfishing", { playedDate: "2026-09-12", parsedData: data(6) }),
      result("catfishing", { playedDate: "2026-09-13", parsedData: data(8) }),
      result("catfishing", { playedDate: "2026-09-14", parsedData: data(10) }),
    ],
    "game-catfishing",
    TODAY,
  );
  assert.equal(view.line, "8.0/10");
  assert.equal(detailValue(view, "Avg correct"), "8.0/10");
  assert.equal(detailValue(view, "Best"), "10/10");
  assert.equal(detailValue(view, "Perfect"), "1");
  assert.equal(view.rankValue, 8);
  assert.equal(view.distribution, undefined);
  assert.equal(catfishingModule.rankDirection, "desc");
});
