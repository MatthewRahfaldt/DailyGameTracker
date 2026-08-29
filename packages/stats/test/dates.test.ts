import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  diffDays,
  enumerateDays,
  isDateString,
  normalizeDate,
  todayUtc,
  toDateString,
  trailingYear,
} from "../src/dates";

test("addDays crosses month, year and leap-day boundaries", () => {
  assert.equal(addDays("2026-08-31", 1), "2026-09-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2027-02-28", 1), "2027-03-01");
});

test("addDays is unaffected by DST — UTC has no such transition", () => {
  // 2026-03-08 is a US spring-forward date; local-time math would lose an hour here
  // and can round a day-add down to the same calendar day.
  assert.equal(addDays("2026-03-07", 1), "2026-03-08");
  assert.equal(addDays("2026-03-08", 1), "2026-03-09");
  assert.equal(diffDays("2026-03-07", "2026-03-09"), 2);
});

test("diffDays is signed and symmetric", () => {
  assert.equal(diffDays("2026-08-01", "2026-08-29"), 28);
  assert.equal(diffDays("2026-08-29", "2026-08-01"), -28);
  assert.equal(diffDays("2026-08-29", "2026-08-29"), 0);
});

test("enumerateDays is inclusive, ordered, and empty when reversed", () => {
  assert.deepEqual(enumerateDays("2026-08-27", "2026-08-29"), [
    "2026-08-27",
    "2026-08-28",
    "2026-08-29",
  ]);
  assert.equal(enumerateDays("2026-08-29", "2026-08-29").length, 1);
  assert.deepEqual(enumerateDays("2026-08-29", "2026-08-27"), []);
});

test("trailingYear spans exactly 365 days ending on the given day", () => {
  const range = trailingYear("2026-08-29");
  assert.equal(range.end, "2026-08-29");
  assert.equal(enumerateDays(range.start, range.end).length, 365);
});

test("normalizeDate accepts Prisma's full ISO timestamps and Date objects", () => {
  assert.equal(normalizeDate("2026-08-29"), "2026-08-29");
  assert.equal(normalizeDate("2026-08-29T00:00:00.000Z"), "2026-08-29");
  assert.equal(normalizeDate(new Date("2026-08-29T23:59:59.999Z")), "2026-08-29");
});

test("a late-evening UTC timestamp stays on its own UTC day", () => {
  // The behaviour the UTC decision buys: no host-timezone drift either direction.
  assert.equal(normalizeDate("2026-08-29T23:30:00.000Z"), "2026-08-29");
  assert.equal(normalizeDate("2026-08-30T00:30:00.000Z"), "2026-08-30");
});

test("todayUtc reads the injected clock, not the host zone", () => {
  assert.equal(todayUtc(new Date("2026-08-29T23:30:00.000Z")), "2026-08-29");
});

test("malformed input is rejected rather than silently coerced", () => {
  assert.equal(isDateString("2026-8-29"), false);
  assert.equal(isDateString("not-a-date"), false);
  assert.equal(isDateString(""), false);
  assert.throws(() => addDays("2026-8-29", 1), RangeError);
  assert.throws(() => normalizeDate("banana"), RangeError);
});

test("toDateString refuses an invalid Date", () => {
  assert.throws(() => toDateString(new Date("nope")), RangeError);
});
