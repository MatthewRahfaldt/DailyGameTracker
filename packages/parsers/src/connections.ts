import type { GameParser, ParsedResult } from "./types";
import { UnparsableTextError } from "./types";

export interface ConnectionsData {
  puzzleNumber: number;
  /** Each guess row, e.g. "🟩🟩🟩🟩". */
  grid: string[];
  /** Number of incorrect guesses (rows that aren't all one color). */
  mistakes: number;
  /** Number of groups correctly solved (rows that are all one color). */
  solvedGroups: number;
}

// e.g. "Connections\nPuzzle #123" (the puzzle number lives on its own line).
const HEADER_RE = /Connections\s*\n\s*Puzzle\s+#?([\d,]+)/i;

// The four Connections group colors.
const GRID_EMOJI = /[🟨🟩🟦🟪]/u;

// A valid guess row is exactly four color squares.
const ROW_RE = /^(?:🟨|🟩|🟦|🟪){4}$/u;

/** Split a row of emoji into an array of individual squares. */
function splitSquares(row: string): string[] {
  return Array.from(row);
}

export const connectionsParser: GameParser<ConnectionsData> = {
  key: "connections",
  name: "Connections",

  detect(text: string): boolean {
    return HEADER_RE.test(text);
  },

  parse(text: string): ParsedResult<ConnectionsData> {
    const headerMatch = text.match(HEADER_RE);
    if (!headerMatch) {
      throw new UnparsableTextError("This doesn't look like a Connections result.");
    }

    const [, puzzleNumberRaw] = headerMatch;
    const puzzleNumber = Number(puzzleNumberRaw.replace(/,/g, ""));

    const grid = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => GRID_EMOJI.test(line));

    if (grid.length === 0) {
      throw new UnparsableTextError(
        "Found a Connections header but no emoji grid to go with it.",
      );
    }

    // A row is a solved group when all four squares share one color.
    let solvedGroups = 0;
    for (const row of grid) {
      if (!ROW_RE.test(row)) continue;
      const squares = splitSquares(row);
      if (squares.every((square) => square === squares[0])) {
        solvedGroups += 1;
      }
    }

    const mistakes = grid.length - solvedGroups;
    // You win by solving all four groups; the game ends at four mistakes.
    const won = solvedGroups === 4;

    return {
      guesses: grid.length,
      won,
      data: {
        puzzleNumber,
        grid,
        mistakes,
        solvedGroups,
      },
    };
  },
};
