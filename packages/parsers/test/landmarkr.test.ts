import { test } from "node:test";
import assert from "node:assert/strict";
import { landmarkrParser } from "../src/landmarkr";
import { parseGameResult, detectParser } from "../src/index";
import { UnparsableTextError } from "../src/types";

const WIN_TEXT = `Landmarkr #334 🌍
⬛ ⬛ ⬛ ⬛ 🟨 🟩
https://landmarkr.app`;

const LOSS_TEXT = `Landmarkr #335 🌍
⬛ ⬛ ⬛ ⬛ ⬛ ⬛
https://landmarkr.app`;

test("detects a Landmarkr share text", () => {
  assert.equal(landmarkrParser.detect(WIN_TEXT), true);
  assert.equal(landmarkrParser.detect("just some random text"), false);
});

test("parses a winning Landmarkr result", () => {
  const result = landmarkrParser.parse(WIN_TEXT);
  assert.equal(result.won, true);
  assert.equal(result.guesses, 6);
  assert.equal(result.data.puzzleNumber, 334);
  assert.equal(result.data.attempts, 6);
  assert.equal(result.data.grid.length, 1);
});

test("parses a failed Landmarkr result", () => {
  const result = landmarkrParser.parse(LOSS_TEXT);
  assert.equal(result.won, false);
  assert.equal(result.guesses, undefined);
  assert.equal(result.data.puzzleNumber, 335);
  assert.equal(result.data.attempts, 6);
});

test("throws a descriptive error on unrecognized text", () => {
  assert.throws(() => landmarkrParser.parse("not a landmarkr result"), UnparsableTextError);
});

test("throws when the header is present but the grid is missing", () => {
  assert.throws(
    () => landmarkrParser.parse("Landmarkr #336 🌍\nhttps://landmarkr.app"),
    UnparsableTextError,
  );
});

test("registry auto-detects the Landmarkr parser", () => {
  const { parser, result } = parseGameResult(WIN_TEXT);
  assert.equal(parser.key, "landmarkr");
  assert.equal(result.won, true);
});
