import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHeatmap, summarizeHeatmap, toWeeks } from "../src/heatmap";
import { dayOfWeek, formatLongDate, formatMonthShort, startOfWeek } from "../src/dates";
import { makeFixture } from "../src/fixtures";

test("dayOfWeek reads UTC, not the host zone", () => {
  assert.equal(dayOfWeek("2026-08-29"), 6); // Saturday
  assert.equal(dayOfWeek("2026-08-30"), 0); // Sunday
});

test("startOfWeek snaps back to Sunday and is idempotent", () => {
  assert.equal(startOfWeek("2026-08-29"), "2026-08-23");
  assert.equal(startOfWeek("2026-08-23"), "2026-08-23");
});

test("month and date labels render in UTC", () => {
  assert.equal(formatMonthShort("2026-08-29"), "Aug");
  assert.equal(formatLongDate("2026-08-29"), "Saturday, August 29, 2026");
});

test("toWeeks builds rectangular Sunday-first columns", () => {
  const days = buildHeatmap([], ["wordle"], { start: "2026-08-26", end: "2026-09-05" });
  const weeks = toWeeks(days);

  assert.ok(weeks.every((week) => week.length === 7));
  // Range starts Wednesday, so the first three cells of week one are padding.
  assert.deepEqual(weeks[0].slice(0, 3), [null, null, null]);
  assert.equal(weeks[0][3]?.date, "2026-08-26");
  assert.equal(weeks.flat().filter(Boolean).length, days.length);
});

test("toWeeks handles an empty range", () => {
  assert.deepEqual(toWeeks([]), []);
});

test("a trailing year lays out as 53 columns", () => {
  const days = buildHeatmap([], ["wordle"], { start: "2025-08-30", end: "2026-08-29" });
  assert.equal(toWeeks(days).length, 53);
});

test("summarizeHeatmap counts active, perfect and total plays", () => {
  const { results, assignedGameIds } = makeFixture({ end: "2026-08-29", days: 30 });
  const days = buildHeatmap(results, assignedGameIds, { start: "2026-07-31", end: "2026-08-29" });
  const summary = summarizeHeatmap(days);

  assert.equal(summary.days, 30);
  assert.ok(summary.activeDays > 0 && summary.activeDays <= 30);
  assert.ok(summary.perfectDays <= summary.activeDays);
  assert.equal(summary.totalPlays, days.reduce((n, d) => n + d.played, 0));
  assert.ok(summary.completionRate > 0 && summary.completionRate <= 1);
});

test("summarizeHeatmap is safe on an empty range", () => {
  const summary = summarizeHeatmap([]);
  assert.equal(summary.completionRate, 0);
  assert.equal(summary.days, 0);
});
