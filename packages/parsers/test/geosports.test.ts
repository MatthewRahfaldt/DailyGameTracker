import { test } from "node:test";
import assert from "node:assert/strict";
import { geoSportsParser } from "../src/geosports";
import { parseGameResult, detectParser } from "../src/index";
import { UnparsableTextError } from "../src/types";

const RESULT_TEXT = `GeoSports · August 29th
545 / 1,000
🟡🟡🟡🔴🟡
[www.geosports.app](https://www.geosports.app)`;

const PERFECT_TEXT = `GeoSports · August 30th
1,000 / 1,000
🟡🟡🟡🟡🟡
[www.geosports.app](https://www.geosports.app)`;

test("detects a GeoSports share text", () => {
  assert.equal(geoSportsParser.detect(RESULT_TEXT), true);
  assert.equal(geoSportsParser.detect("just some random text"), false);
});

test("parses a GeoSports result", () => {
  const result = geoSportsParser.parse(RESULT_TEXT);
  assert.equal(result.won, false);
  assert.equal(result.data.date, "August 29th");
  assert.equal(result.data.score, 545);
  assert.equal(result.data.maxScore, 1000);
  assert.equal(result.data.correct, 4);
  assert.equal(result.data.grid.length, 1);
});

test("marks a perfect GeoSports score as won", () => {
  const result = geoSportsParser.parse(PERFECT_TEXT);
  assert.equal(result.won, true);
  assert.equal(result.data.score, 1000);
  assert.equal(result.data.correct, 5);
});

test("throws a descriptive error on unrecognized text", () => {
  assert.throws(() => geoSportsParser.parse("not a geosports result"), UnparsableTextError);
});

test("throws when the header is present but the grid is missing", () => {
  assert.throws(
    () => geoSportsParser.parse("GeoSports · August 29th\n545 / 1,000"),
    UnparsableTextError,
  );
});

test("registry auto-detects the GeoSports parser", () => {
  const { parser } = parseGameResult(RESULT_TEXT);
  assert.equal(parser.key, "geosports");
});

test("does not confuse GeoSports with GeoHistory", () => {
  assert.equal(detectParser("GeoHistory · August 29th\n645 / 1,000\n🟡")?.key, "geohistory");
});
