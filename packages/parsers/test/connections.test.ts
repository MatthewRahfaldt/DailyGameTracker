import { test } from "node:test";
import assert from "node:assert/strict";
import { connectionsParser } from "../src/connections";
import { parseGameResult, detectParser } from "../src/index";
import { UnparsableTextError } from "../src/types";

// A clean win: four solved groups, no mistakes.
const WIN_TEXT = `Connections
Puzzle #123
🟩🟩🟩🟩
🟨🟨🟨🟨
🟦🟦🟦🟦
🟪🟪🟪🟪`;

// A win with two mistakes before solving all four groups.
const WIN_WITH_MISTAKES_TEXT = `Connections
Puzzle #124
🟩🟨🟩🟩
🟦🟦🟪🟦
🟩🟩🟩🟩
🟨🟨🟨🟨
🟦🟦🟦🟦
🟪🟪🟪🟪`;

// A loss: four mistakes and only two groups solved.
const LOSS_TEXT = `Connections
Puzzle #125
🟩🟩🟩🟨
🟦🟦🟪🟦
🟨🟨🟨🟨
🟪🟪🟩🟪
🟩🟩🟩🟩
🟦🟦🟦🟪`;

test("detects a Connections share text", () => {
  assert.equal(connectionsParser.detect(WIN_TEXT), true);
  assert.equal(connectionsParser.detect("just some random text"), false);
});

test("parses a clean winning Connections result", () => {
  const result = connectionsParser.parse(WIN_TEXT);
  assert.equal(result.won, true);
  assert.equal(result.guesses, 4);
  assert.equal(result.data.puzzleNumber, 123);
  assert.equal(result.data.solvedGroups, 4);
  assert.equal(result.data.mistakes, 0);
  assert.equal(result.data.grid.length, 4);
});

test("parses a win that had mistakes along the way", () => {
  const result = connectionsParser.parse(WIN_WITH_MISTAKES_TEXT);
  assert.equal(result.won, true);
  assert.equal(result.guesses, 6);
  assert.equal(result.data.puzzleNumber, 124);
  assert.equal(result.data.solvedGroups, 4);
  assert.equal(result.data.mistakes, 2);
});

test("parses a failed Connections result", () => {
  const result = connectionsParser.parse(LOSS_TEXT);
  assert.equal(result.won, false);
  assert.equal(result.data.puzzleNumber, 125);
  assert.equal(result.data.solvedGroups, 2);
  assert.equal(result.data.mistakes, 4);
  assert.equal(result.data.grid.length, 6);
});

test("throws a descriptive error on unrecognized text", () => {
  assert.throws(() => connectionsParser.parse("not a connections result"), UnparsableTextError);
});

test("throws when the header is present but the grid is missing", () => {
  assert.throws(
    () => connectionsParser.parse("Connections\nPuzzle #200\n"),
    UnparsableTextError,
  );
});

test("registry auto-detects the Connections parser", () => {
  const { parser, result } = parseGameResult(WIN_TEXT);
  assert.equal(parser.key, "connections");
  assert.equal(result.won, true);
});

test("registry returns undefined for unrecognized text via detectParser", () => {
  assert.equal(detectParser("gibberish input"), undefined);
});
