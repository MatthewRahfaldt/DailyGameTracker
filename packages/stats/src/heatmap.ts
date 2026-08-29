import type { GameResult } from "@dgt/types";
import {
  type DateString,
  addDays,
  diffDays,
  enumerateDays,
  normalizeDate,
  startOfWeek,
  trailingYear,
} from "./dates";

/** One cell in the calendar heatmap. */
export interface HeatmapDay {
  /** UTC calendar day. */
  date: DateString;
  /** How many games the user was tracking (constant across the range for now). */
  assigned: number;
  /** How many of those games have a result on this day. */
  played: number;
  /** `played / assigned`, 0..1 — drives colour intensity. */
  ratio: number;
  /** The day's results, for the click-through detail view. */
  results: GameResult[];
}

export interface HeatmapRange {
  start: DateString;
  end: DateString;
}

/**
 * Bucket results into one cell per UTC day (docs/BACKLOG.md, Milestone 4).
 *
 * Results for games the user isn't tracking are ignored, so un-assigning a game hides it
 * from the heatmap without deleting history. Days outside `range` are dropped; days inside
 * it with no results still get a zero-ratio cell, so the grid is never ragged.
 */
export function buildHeatmap(
  results: readonly GameResult[],
  assignedGameIds: readonly string[],
  range: HeatmapRange = trailingYear(),
): HeatmapDay[] {
  const assigned = new Set(assignedGameIds);
  const byDate = new Map<DateString, Map<string, GameResult>>();

  for (const result of results) {
    if (!assigned.has(result.gameId)) continue;
    const date = normalizeDate(result.playedDate);
    let day = byDate.get(date);
    if (!day) {
      day = new Map();
      byDate.set(date, day);
    }
    // Keyed by game so a duplicate paste counts once, matching the
    // @@unique([userId, gameId, playedDate]) constraint in prisma/schema.prisma.
    day.set(result.gameId, result);
  }

  return enumerateDays(range.start, range.end).map((date) => {
    const day = byDate.get(date);
    const played = day?.size ?? 0;
    return {
      date,
      assigned: assigned.size,
      played,
      ratio: assigned.size === 0 ? 0 : played / assigned.size,
      results: day ? [...day.values()] : [],
    };
  });
}

/**
 * Arrange days into GitHub-style columns — one column per week, seven rows Sunday→Saturday.
 * Cells before the first day or after the last are `null` so the grid stays rectangular
 * instead of ragged at the edges.
 */
export function toWeeks(days: readonly HeatmapDay[]): (HeatmapDay | null)[][] {
  if (days.length === 0) return [];

  const byDate = new Map(days.map((day) => [day.date, day]));
  const first = startOfWeek(days[0].date);
  const last = addDays(startOfWeek(days[days.length - 1].date), 6);

  const weeks: (HeatmapDay | null)[][] = [];
  for (let cursor = first; diffDays(cursor, last) >= 0; cursor = addDays(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, row) => byDate.get(addDays(cursor, row)) ?? null));
  }
  return weeks;
}

export interface HeatmapSummary {
  /** Days in the range. */
  days: number;
  /** Days with at least one result. */
  activeDays: number;
  /** Days where every tracked game was played. */
  perfectDays: number;
  /** Total game-plays across the range. */
  totalPlays: number;
  /** 0..1 — plays over the maximum possible. */
  completionRate: number;
}

export function summarizeHeatmap(days: readonly HeatmapDay[]): HeatmapSummary {
  const totalPlays = days.reduce((sum, day) => sum + day.played, 0);
  const possible = days.reduce((sum, day) => sum + day.assigned, 0);
  return {
    days: days.length,
    activeDays: days.filter((day) => day.played > 0).length,
    perfectDays: days.filter((day) => day.assigned > 0 && day.played === day.assigned).length,
    totalPlays,
    completionRate: possible === 0 ? 0 : totalPlays / possible,
  };
}
