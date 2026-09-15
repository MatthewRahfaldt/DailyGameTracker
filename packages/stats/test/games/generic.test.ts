import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule, summarizeResult } from "../../src/games";
import { dailyResults, genericModule } from "../../src/games/generic";
import { TODAY, detailValue, game, result } from "./helpers";

const nerdle = game("nerdle", "Nerdle");

test("generic summary shows a check for a win, a cross for a loss, Played otherwise", () => {
  const win = genericModule.summarize(result("nerdle", { playedDate: TODAY, won: true }), nerdle);
  assert.deepEqual(win, {
    resultId: `r-nerdle-${TODAY}`,
    gameId: "game-nerdle",
    label: "NERDLE",
    value: "✓",
    outcome: "win",
    grid: [],
  });
  assert.equal(genericModule.summarize(result("nerdle", { playedDate: TODAY, won: false }), nerdle).outcome, "loss");
  const played = genericModule.summarize(result("nerdle", { playedDate: TODAY }), nerdle);
  assert.equal(played.value, "Played");
  assert.equal(played.outcome, "score");
});

test("generic stats report played, streaks and rank by current streak", () => {
  const results = [
    result("nerdle", { playedDate: "2026-09-13", won: true }),
    result("nerdle", { playedDate: "2026-09-14", won: true }),
  ];
  const view = genericModule.stats(results, "game-nerdle", TODAY);
  assert.equal(view.played, 2);
  assert.equal(view.currentStreak, 2);
  assert.equal(view.line, "2 played");
  assert.equal(detailValue(view, "Best streak"), "2");
  assert.equal(view.rankValue, 2);
});

test("generic stats with no results have no rank value", () => {
  assert.equal(genericModule.stats([], "game-nerdle", TODAY).rankValue, null);
});

test("unknown parser keys fall back to the generic module", () => {
  assert.equal(getGameModule("does-not-exist"), genericModule);
  assert.equal(summarizeResult(result("nerdle", { playedDate: TODAY, won: true }), nerdle).value, "✓");
});

test("dailyResults dedupes by day and sorts oldest first", () => {
  const rows = dailyResults(
    [
      result("nerdle", { playedDate: "2026-09-14", won: true }),
      result("nerdle", { playedDate: "2026-09-12", won: true }),
      { ...result("nerdle", { playedDate: "2026-09-14", won: false }), id: "dupe" },
      result("other", { playedDate: "2026-09-13", won: true }),
    ],
    "game-nerdle",
  );
  assert.deepEqual(rows.map((row) => row.id), [`r-nerdle-2026-09-12`, "dupe"]);
});
