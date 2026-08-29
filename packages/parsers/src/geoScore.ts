import type { GameParser, ParsedResult } from "./types";
import { UnparsableTextError } from "./types";

/**
 * Shared shape for the "Geo" family of daily games (GeoSports, GeoHistory, …).
 * They share a header + score line and a row of 🟡 / 🔴 result squares.
 */
export interface GeoScoreData extends Record<string, unknown> {
  /** The puzzle's date label, e.g. "August 29th". */
  date: string;
  /** Points scored (the numerator). */
  score: number;
  /** Maximum possible score (the denominator, e.g. 1000). */
  maxScore: number;
  /** Each result row of 🟡 / 🔴 squares. */
  grid: string[];
  /** Number of correct (🟡) answers across the grid. */
  correct: number;
}

// Result squares: yellow = correct, red = wrong.
const GRID_EMOJI = /[🟡🔴🟢⚪]/u;
const CORRECT = "🟡";

/**
 * Build a parser for a Geo-family game.
 * @param key   Parser key stored on the Game record.
 * @param name  Human-readable name, matched at the start of the share text.
 */
export function createGeoScoreParser(key: string, name: string): GameParser<GeoScoreData> {
  // e.g. "GeoSports · August 29th".
  const headerRe = new RegExp(`${name}\\s*[·]\\s*(.+)`, "i");
  // e.g. "545 / 1,000".
  const scoreRe = /([\d,]+)\s*\/\s*([\d,]+)/;

  return {
    key,
    name,

    detect(text: string): boolean {
      return headerRe.test(text);
    },

    parse(text: string): ParsedResult<GeoScoreData> {
      const headerMatch = text.match(headerRe);
      if (!headerMatch) {
        throw new UnparsableTextError(`This doesn't look like a ${name} result.`);
      }

      const date = headerMatch[1].trim();

      const scoreMatch = text.match(scoreRe);
      if (!scoreMatch) {
        throw new UnparsableTextError(`Found a ${name} header but no score line.`);
      }
      const score = Number(scoreMatch[1].replace(/,/g, ""));
      const maxScore = Number(scoreMatch[2].replace(/,/g, ""));

      const grid = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => GRID_EMOJI.test(line));

      if (grid.length === 0) {
        throw new UnparsableTextError(
          `Found a ${name} header but no emoji grid to go with it.`,
        );
      }

      const correct = grid.reduce(
        (count, row) => count + Array.from(row).filter((square) => square === CORRECT).length,
        0,
      );

      return {
        won: score === maxScore,
        data: {
          date,
          score,
          maxScore,
          grid,
          correct,
        },
      };
    },
  };
}
