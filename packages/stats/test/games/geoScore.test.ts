import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule } from "../../src/games";
import { createGeoScoreModule } from "../../src/games/geoScore";
import { TODAY, detailValue, game, result } from "./helpers";

const geosports = game("geosports", "GeoSports");
const module = createGeoScoreModule("geosports");
const data = (score: number, correct = 4) => ({
  date: "September 14th",
  score,
  maxScore: 1000,
  correct,
  grid: ["🟡🟡🔴🟡🟡"],
});

test("registry has modules for both Geo games", () => {
  assert.equal(getGameModule("geosports").parserKey, "geosports");
  assert.equal(getGameModule("geohistory").parserKey, "geohistory");
});

test("a result shows the score out of the max with separators", () => {
  const summary = module.summarize(
    result("geosports", { playedDate: TODAY, won: false, parsedData: data(845) }),
    geosports,
  );
  assert.equal(summary.value, "845");
  assert.equal(summary.suffix, "/1,000");
  assert.equal(summary.outcome, "score");
  assert.deepEqual(summary.grid, ["🟡🟡🔴🟡🟡"]);
  const perfect = module.summarize(
    result("geosports", { playedDate: TODAY, won: true, parsedData: data(1000) }),
    geosports,
  );
  assert.equal(perfect.value, "1,000");
  assert.equal(perfect.outcome, "win");
});

test("stats average score and rank higher first", () => {
  const view = module.stats(
    [
      result("geosports", { playedDate: "2026-09-13", parsedData: data(800, 3) }),
      result("geosports", { playedDate: "2026-09-14", parsedData: data(900, 4) }),
    ],
    "game-geosports",
    TODAY,
  );
  assert.equal(view.line, "850 avg");
  assert.equal(detailValue(view, "Best"), "900");
  assert.equal(detailValue(view, "Avg correct"), "3.5");
  assert.equal(view.rankValue, 850);
  assert.equal(module.rankDirection, "desc");
});
