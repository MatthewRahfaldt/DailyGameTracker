import { test } from "node:test";
import assert from "node:assert/strict";
import { dateFromPuzzleNumber, parseGeoDateLabel, resolveGeoDate } from "../src/dating";

test("dateFromPuzzleNumber uses Wordle's known epoch", () => {
  const result = dateFromPuzzleNumber("wordle", 1);
  assert.equal(result?.date, "2021-06-20");
  assert.equal(result?.confidence, "certain");
});

test("dateFromPuzzleNumber walks forward/backward from Wordle's epoch", () => {
  assert.equal(dateFromPuzzleNumber("wordle", 2)?.date, "2021-06-21");
  assert.equal(dateFromPuzzleNumber("wordle", 32)?.date, "2021-07-21");
});

test("dateFromPuzzleNumber uses Connections' known epoch", () => {
  const result = dateFromPuzzleNumber("connections", 1);
  assert.equal(result?.date, "2023-06-12");
  assert.equal(result?.confidence, "certain");
});

test("dateFromPuzzleNumber returns undefined for a game with no epoch and no anchor", () => {
  assert.equal(dateFromPuzzleNumber("catfishing", 42), undefined);
});

test("dateFromPuzzleNumber calibrates off a supplied anchor", () => {
  const result = dateFromPuzzleNumber("catfishing", 105, { puzzleNumber: 100, date: "2026-01-01" });
  assert.equal(result?.date, "2026-01-06");
  assert.equal(result?.confidence, "certain");
});

test("dateFromPuzzleNumber calibrates backward off an anchor too", () => {
  const result = dateFromPuzzleNumber("landmarkr", 90, { puzzleNumber: 100, date: "2026-01-10" });
  assert.equal(result?.date, "2025-12-31");
});

test("parseGeoDateLabel reads month and day out of a label", () => {
  assert.deepEqual(parseGeoDateLabel("August 29th"), { month: 8, day: 29 });
  assert.deepEqual(parseGeoDateLabel("Jan 3"), { month: 1, day: 3 });
});

test("parseGeoDateLabel returns undefined for unrecognized text", () => {
  assert.equal(parseGeoDateLabel("not a date"), undefined);
});

test("resolveGeoDate assumes the most recent matching year by default", () => {
  const referenceDate = new Date("2026-09-27T12:00:00Z");
  // "August 29th" relative to 2026-09-27 is only a month ago this year — should pick 2026.
  const result = resolveGeoDate("August 29th", { assumeRecentImports: true, referenceDate });
  assert.equal(result.date, "2026-08-29");
  assert.equal(result.confidence, "needs-confirmation");
});

test("resolveGeoDate picks last year when this year's date would be in the future", () => {
  const referenceDate = new Date("2026-09-27T12:00:00Z");
  // December hasn't happened yet in 2026, so the "within the last year" candidate is Dec 2025.
  const result = resolveGeoDate("December 15th", { assumeRecentImports: true, referenceDate });
  assert.equal(result.date, "2025-12-15");
});

test("resolveGeoDate does not guess a year when assumeRecentImports is false", () => {
  const referenceDate = new Date("2026-09-27T12:00:00Z");
  const result = resolveGeoDate("August 29th", { assumeRecentImports: false, referenceDate });
  assert.equal(result.date, "2026-08-29");
  assert.equal(result.confidence, "needs-confirmation");
});

test("resolveGeoDate falls back gracefully when the label can't be parsed", () => {
  const referenceDate = new Date("2026-09-27T12:00:00Z");
  const result = resolveGeoDate("garbled", { assumeRecentImports: true, referenceDate });
  assert.equal(result.confidence, "needs-confirmation");
  assert.equal(result.date, "2026-09-27");
});
