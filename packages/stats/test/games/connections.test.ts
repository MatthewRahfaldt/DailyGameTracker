import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule } from "../../src/games";
import { connectionsModule } from "../../src/games/connections";
import { TODAY, detailValue, game, result } from "./helpers";

const connections = game("connections", "Connections");
const grid = ["🟨🟨🟨🟨", "🟩🟦🟩🟩", "🟩🟩🟩🟩", "🟦🟦🟦🟦", "🟪🟪🟪🟪"];
const data = (mistakes: number) => ({ puzzleNumber: 512, grid, mistakes, solvedGroups: 4 });

test("registry returns the Connections module", () => {
  assert.equal(getGameModule("connections"), connectionsModule);
});

test("a solve shows the mistake count", () => {
  const one = connectionsModule.summarize(
    result("connections", { playedDate: TODAY, won: true, parsedData: data(1) }),
    connections,
  );
  assert.equal(one.value, "1");
  assert.equal(one.suffix, " mistake");
  assert.equal(one.outcome, "win");
  assert.deepEqual(one.grid, grid);
  const zero = connectionsModule.summarize(
    result("connections", { playedDate: TODAY, won: true, parsedData: data(0) }),
    connections,
  );
  assert.equal(zero.suffix, " mistakes");
});

test("a failed puzzle shows a cross", () => {
  const summary = connectionsModule.summarize(
    result("connections", { playedDate: TODAY, won: false, parsedData: data(4) }),
    connections,
  );
  assert.equal(summary.value, "✗");
  assert.equal(summary.suffix, undefined);
  assert.equal(summary.outcome, "loss");
});

test("missing mistakes falls back to the generic card", () => {
  const summary = connectionsModule.summarize(
    result("connections", { playedDate: TODAY, won: true, parsedData: { grid } }),
    connections,
  );
  assert.equal(summary.value, "✓");
});

test("stats average mistakes over every readable result", () => {
  const view = connectionsModule.stats(
    [
      result("connections", { playedDate: "2026-09-12", won: true, parsedData: data(0) }),
      result("connections", { playedDate: "2026-09-13", won: true, parsedData: data(2) }),
      result("connections", { playedDate: "2026-09-14", won: false, parsedData: data(4) }),
    ],
    "game-connections",
    TODAY,
  );
  assert.equal(view.line, "2.0 mistakes");
  assert.equal(detailValue(view, "Solved"), "67%");
  assert.equal(detailValue(view, "Perfect"), "1");
  assert.equal(view.rankValue, 2);
  const counts = Object.fromEntries((view.distribution ?? []).map((bar) => [bar.label, bar.count]));
  assert.deepEqual(counts, { "0": 1, "1": 0, "2": 1, "3": 0, "✗": 1 });
});
