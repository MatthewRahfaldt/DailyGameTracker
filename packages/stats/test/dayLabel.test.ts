import { test } from "node:test";
import assert from "node:assert/strict";
import { dayLabel, formatShortDate } from "../src/dates";

test("formatShortDate renders month and day in UTC", () => {
  assert.equal(formatShortDate("2026-09-14"), "Sep 14");
  assert.equal(formatShortDate("2026-01-01"), "Jan 1");
});

test("dayLabel says Today, Yesterday, or a short date", () => {
  assert.equal(dayLabel("2026-09-14", "2026-09-14"), "Today");
  assert.equal(dayLabel("2026-09-13", "2026-09-14"), "Yesterday");
  assert.equal(dayLabel("2026-09-10", "2026-09-14"), "Sep 10");
});
