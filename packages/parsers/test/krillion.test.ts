import { test } from "node:test";
import assert from "node:assert/strict";
import { krillionParser } from "../src/krillion";
import { parseGameResult, detectParser } from "../src/index";
import { UnparsableTextError } from "../src/types";

const BASIC_TEXT = `Krillion #58 🦐
340

🦑🦑🦑🦑🦑🐟🫧`;

// Discord-bolded header, CRLF line endings — a real second-hand paste, not just the clean case.
const BOLD_CRLF_TEXT = "**Krillion #7** 🦐\r\n125\r\n\r\n🫧🫧🐟🫧🫧🤡⬛";

// Surrounding chatter above and below the result — pasting straight from a group chat.
const CHATTER_TEXT = `gg everyone

Krillion #58 🦐
340

🦑🦑🦑🦑🦑🐟🫧
krillion.io

that last one was brutal`;

const PERFECT_TEXT = `Krillion #100 🦐
700

🌟🌟🌟🌟🌟🌟🌟`;

test("detects a Krillion share text", () => {
  assert.equal(krillionParser.detect(BASIC_TEXT), true);
  assert.equal(krillionParser.detect("just some random text"), false);
});

test("parses a basic Krillion result", () => {
  const result = krillionParser.parse(BASIC_TEXT);
  assert.equal(result.won, undefined);
  assert.equal(result.data.puzzleNumber, 58);
  assert.equal(result.data.score, 340);
  assert.deepEqual(result.data.grid, ["🦑🦑🦑🦑🦑🐟🫧"]);
});

test("parses a bolded, CRLF share text", () => {
  const result = krillionParser.parse(BOLD_CRLF_TEXT);
  assert.equal(result.data.puzzleNumber, 7);
  assert.equal(result.data.score, 125);
  assert.deepEqual(result.data.grid, ["🫧🫧🐟🫧🫧🤡⬛"]);
});

test("ignores chatter pasted around the result", () => {
  const result = krillionParser.parse(CHATTER_TEXT);
  assert.equal(result.data.puzzleNumber, 58);
  assert.equal(result.data.score, 340);
});

test("parses a perfect score", () => {
  const result = krillionParser.parse(PERFECT_TEXT);
  assert.equal(result.data.score, 700);
  assert.deepEqual(result.data.grid, ["🌟🌟🌟🌟🌟🌟🌟"]);
});

test("allows a missing grid — some pastes only include the header and score", () => {
  const result = krillionParser.parse("Krillion #12\n0");
  assert.equal(result.data.puzzleNumber, 12);
  assert.equal(result.data.score, 0);
  assert.deepEqual(result.data.grid, []);
});

test("throws a descriptive error on unrecognized text", () => {
  assert.throws(() => krillionParser.parse("not a krillion result"), UnparsableTextError);
});

test("throws when the header is present but no score line follows", () => {
  assert.throws(() => krillionParser.parse("Krillion #58 🦐\nno score here"), UnparsableTextError);
});

test("registry auto-detects the Krillion parser", () => {
  const { parser, result } = parseGameResult(BASIC_TEXT);
  assert.equal(parser.key, "krillion");
  assert.equal(result.data && (result.data as { score: number }).score, 340);
});

test("registry returns undefined for unrecognized text via detectParser", () => {
  assert.equal(detectParser("gibberish input"), undefined);
});
