/**
 * Type guards for GameResult.parsedData. It is JSON written by whichever parser version saved the
 * row, so every read is defensive: a missing or wrongly-typed field yields null, and the calling
 * module falls back to the generic summary instead of rendering garbage.
 */

import type { GameResult } from "@dgt/types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readNumber(data: Record<string, unknown>, key: string): number | null {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readGrid(data: Record<string, unknown>): string[] | null {
  const grid = data.grid;
  if (!Array.isArray(grid) || !grid.every((row) => typeof row === "string")) return null;
  return grid as string[];
}

/** The emoji grid from a result's parsedData, or null when missing or malformed. */
export function readResultGrid(result: GameResult): string[] | null {
  return isRecord(result.parsedData) ? readGrid(result.parsedData) : null;
}
