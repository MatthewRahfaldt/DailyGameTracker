import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule } from "../../src/games";
import { landmarkrModule } from "../../src/games/landmarkr";
import { TODAY, detailValue, game, result } from "./helpers";

const landmarkr = game("landmarkr", "Landmarkr");
const data = { puzzleNumber: 334, grid: ["⬛ ⬛ ⬛ ⬛ 🟩"], attempts: 5 };

test("registry returns the Landmarkr module", () => {
  assert.equal(getGameModule("landmarkr"), landmarkrModule);
});

test("a find shows the guess count", () => {
  const five = landmarkrModule.summarize(
    result("landmarkr", { playedDate: TODAY, won: true, guesses: 5, parsedData: data }),
    landmarkr,
  );
  assert.equal(five.value, "5");
  assert.equal(five.suffix, " guesses");
  assert.equal(five.outcome, "win");
  assert.deepEqual(five.grid, data.grid);
  const one = landmarkrModule.summarize(
    result("landmarkr", { playedDate: TODAY, won: true, guesses: 1, parsedData: data }),
    landmarkr,
  );
  assert.equal(one.suffix, " guess");
});

test("not found shows a cross", () => {
  const summary = landmarkrModule.summarize(
    result("landmarkr", { playedDate: TODAY, won: false, parsedData: data }),
    landmarkr,
  );
  assert.equal(summary.value, "✗");
  assert.equal(summary.outcome, "loss");
});

test("stats average guesses over finds", () => {
  const view = landmarkrModule.stats(
    [
      result("landmarkr", { playedDate: "2026-09-12", won: true, guesses: 2 }),
      result("landmarkr", { playedDate: "2026-09-13", won: true, guesses: 4 }),
      result("landmarkr", { playedDate: "2026-09-14", won: false }),
    ],
    "game-landmarkr",
    TODAY,
  );
  assert.equal(view.line, "3.0 guesses");
  assert.equal(detailValue(view, "Found"), "67%");
  assert.equal(view.rankValue, 3);
});
