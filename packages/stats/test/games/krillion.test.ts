import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule } from "../../src/games";
import { krillionModule } from "../../src/games/krillion";
import { TODAY, detailValue, game, result } from "./helpers";

const krillion = game("krillion", "Krillion");
const data = (score: number, grid: string[] = ["🦑🦑🦑🦑🦑🐟🫧"]) => ({ score, grid });

test("registry has a module for Krillion", () => {
  assert.equal(getGameModule("krillion").parserKey, "krillion");
});

test("a result shows the raw score with no suffix and the 'score' outcome", () => {
  const summary = krillionModule.summarize(
    result("krillion", { playedDate: TODAY, won: null, parsedData: data(340) }),
    krillion,
  );
  assert.equal(summary.value, "340");
  assert.equal(summary.suffix, undefined);
  assert.equal(summary.outcome, "score");
  assert.deepEqual(summary.grid, ["🦑🦑🦑🦑🦑🐟🫧"]);
});

test("falls back to the generic summary when parsedData is unreadable", () => {
  const summary = krillionModule.summarize(
    result("krillion", { playedDate: TODAY, won: null, parsedData: null }),
    krillion,
  );
  assert.equal(summary.value, "Played");
});

test("stats average score and rank higher first", () => {
  const view = krillionModule.stats(
    [
      result("krillion", { playedDate: "2026-09-13", parsedData: data(300) }),
      result("krillion", { playedDate: "2026-09-14", parsedData: data(400) }),
    ],
    "game-krillion",
    TODAY,
  );
  assert.equal(view.line, "350 avg");
  assert.equal(detailValue(view, "Best"), "400");
  assert.equal(view.rankValue, 350);
  assert.equal(krillionModule.rankDirection, "desc");
});
