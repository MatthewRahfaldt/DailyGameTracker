import { test } from "node:test";
import assert from "node:assert/strict";
import { catfishingParser } from "../src/catfishing";
import { parseGameResult, detectParser } from "../src/index";
import { UnparsableTextError } from "../src/types";

const LOW_SCORE_TEXT = `catfishing.net
#797 - 1/10
🐟🐟🐟🐟🐟
🐟🐟🐟🐈🐟`;

const PERFECT_TEXT = `catfishing.net
#798 - 10/10
🐈🐈🐈🐈🐈
🐈🐈🐈🐈🐈`;

// One "close enough" egg — half credit, so the header shows a .5 score.
const HALF_POINT_TEXT = `catfishing.net
#801 - 6.5/10
🐈🐈🥚🐟🐟
🐈🐈🐈🐟🐈`;

// A perfect-looking header total that only got there via close-enough eggs shouldn't be a win.
const ALL_CLOSE_ENOUGH_TEXT = `catfishing.net
#802 - 5/10
🥚🥚🥚🥚🥚
🥚🥚🥚🥚🥚`;

test("detects a Catfishing share text", () => {
  assert.equal(catfishingParser.detect(LOW_SCORE_TEXT), true);
  assert.equal(catfishingParser.detect("just some random text"), false);
});

test("parses a low-scoring Catfishing result", () => {
  const result = catfishingParser.parse(LOW_SCORE_TEXT);
  assert.equal(result.won, false);
  assert.equal(result.data.puzzleNumber, 797);
  assert.equal(result.data.correct, 1);
  assert.equal(result.data.totalQuestions, 10);
  assert.equal(result.data.grid.length, 2);
});

test("marks a perfect Catfishing score as won", () => {
  const result = catfishingParser.parse(PERFECT_TEXT);
  assert.equal(result.won, true);
  assert.equal(result.data.puzzleNumber, 798);
  assert.equal(result.data.correct, 10);
  assert.equal(result.data.totalQuestions, 10);
});

test("parses a half-point score from a 'close enough' egg", () => {
  const result = catfishingParser.parse(HALF_POINT_TEXT);
  assert.equal(result.won, false);
  assert.equal(result.data.puzzleNumber, 801);
  assert.equal(result.data.correct, 6.5);
  assert.equal(result.data.totalQuestions, 10);
});

test("an all-close-enough run isn't a win even if the total looks tidy", () => {
  const result = catfishingParser.parse(ALL_CLOSE_ENOUGH_TEXT);
  assert.equal(result.won, false);
  assert.equal(result.data.correct, 5);
});

test("throws a descriptive error on unrecognized text", () => {
  assert.throws(() => catfishingParser.parse("not a catfishing result"), UnparsableTextError);
});

test("throws when the grid's catfish/egg count disagrees with the header", () => {
  const MISMATCH_TEXT = `catfishing.net
#800 - 3/10
🐟🐟🐟🐟🐟
🐟🐟🐟🐈🐟`;
  assert.throws(() => catfishingParser.parse(MISMATCH_TEXT), UnparsableTextError);
});

test("throws when a half-point header disagrees with the grid's egg count", () => {
  const MISMATCH_TEXT = `catfishing.net
#803 - 7/10
🐈🐈🥚🐟🐟
🐈🐈🐈🐟🐈`;
  assert.throws(() => catfishingParser.parse(MISMATCH_TEXT), UnparsableTextError);
});

test("throws when the header is present but the grid is missing", () => {
  assert.throws(
    () => catfishingParser.parse("catfishing.net\n#799 - 2/10\n"),
    UnparsableTextError,
  );
});

test("registry auto-detects the Catfishing parser", () => {
  const { parser, result } = parseGameResult(PERFECT_TEXT);
  assert.equal(parser.key, "catfishing");
  assert.equal(result.won, true);
});

test("registry returns undefined for unrecognized text via detectParser", () => {
  assert.equal(detectParser("gibberish input"), undefined);
});
