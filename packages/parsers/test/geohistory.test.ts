import { test } from "node:test";
import assert from "node:assert/strict";
import { geoHistoryParser } from "../src/geohistory";
import { parseGameResult } from "../src/index";
import { UnparsableTextError } from "../src/types";

const RESULT_TEXT = `GeoHistory · August 29th
645 / 1,000
🟡🟡🔴🟡🟡
[www.geohistory.gg](https://www.geohistory.gg)`;

test("detects a GeoHistory share text", () => {
  assert.equal(geoHistoryParser.detect(RESULT_TEXT), true);
  assert.equal(geoHistoryParser.detect("just some random text"), false);
});

test("parses a GeoHistory result", () => {
  const result = geoHistoryParser.parse(RESULT_TEXT);
  assert.equal(result.won, false);
  assert.equal(result.data.date, "August 29th");
  assert.equal(result.data.score, 645);
  assert.equal(result.data.maxScore, 1000);
  assert.equal(result.data.correct, 4);
  assert.equal(result.data.grid.length, 1);
});

test("throws a descriptive error on unrecognized text", () => {
  assert.throws(() => geoHistoryParser.parse("not a geohistory result"), UnparsableTextError);
});

test("throws when the header is present but the grid is missing", () => {
  assert.throws(
    () => geoHistoryParser.parse("GeoHistory · August 29th\n645 / 1,000"),
    UnparsableTextError,
  );
});

test("registry auto-detects the GeoHistory parser", () => {
  const { parser } = parseGameResult(RESULT_TEXT);
  assert.equal(parser.key, "geohistory");
});
