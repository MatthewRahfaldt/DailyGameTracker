import { test } from "node:test";
import assert from "node:assert/strict";
import { wordleParser } from "../src/wordle";
import { parseGameResult, detectParser } from "../src/index";
import { UnparsableTextError } from "../src/types";

const WIN_TEXT = `Wordle 1,234 3/6

⬛🟨⬛⬛⬛
⬛🟩🟨⬛⬛
🟩🟩🟩🟩🟩`;

const HARD_MODE_LOSS_TEXT = `Wordle 1,235 X/6*

⬛⬛⬛⬛⬛
🟨⬛⬛⬛⬛
⬛🟨⬛⬛⬛
⬛⬛🟨⬛⬛
⬛⬛⬛🟨⬛
⬛⬛⬛⬛🟨`;

test("detects a Wordle share text", () => {
  assert.equal(wordleParser.detect(WIN_TEXT), true);
  assert.equal(wordleParser.detect("just some random text"), false);
});

test("parses a winning Wordle result", () => {
  const result = wordleParser.parse(WIN_TEXT);
  assert.equal(result.won, true);
  assert.equal(result.guesses, 3);
  assert.equal(result.data.puzzleNumber, 1234);
  assert.equal(result.data.hardMode, false);
  assert.equal(result.data.grid.length, 3);
});

test("parses a failed hard-mode Wordle result", () => {
  const result = wordleParser.parse(HARD_MODE_LOSS_TEXT);
  assert.equal(result.won, false);
  assert.equal(result.guesses, undefined);
  assert.equal(result.data.puzzleNumber, 1235);
  assert.equal(result.data.hardMode, true);
  assert.equal(result.data.grid.length, 6);
});

test("throws a descriptive error on unrecognized text", () => {
  assert.throws(() => wordleParser.parse("not a wordle result"), UnparsableTextError);
});

test("registry auto-detects the right parser", () => {
  const { parser, result } = parseGameResult(WIN_TEXT);
  assert.equal(parser.key, "wordle");
  assert.equal(result.won, true);
});

test("registry returns undefined for unrecognized text via detectParser", () => {
  assert.equal(detectParser("gibberish input"), undefined);
});
