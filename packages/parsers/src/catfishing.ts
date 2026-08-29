import type { GameParser, ParsedResult } from "./types";
import { UnparsableTextError } from "./types";

export interface CatfishingData {
  puzzleNumber: number;
  /** Number of questions answered correctly. */
  correct: number;
  /** Total number of questions (the denominator, e.g. 10). */
  totalQuestions: number;
  /** Each row of 🐟 / 🐈 squares; one square per question. */
  grid: string[];
}

// e.g. "catfishing.net\n#797 - 1/10" — "correct / total questions".
const HEADER_RE = /catfishing\.net\s*\n\s*#(\d+)\s*-\s*(\d+)\/(\d+)/i;

// Each question is one square: a plain fish (wrong) or the catfish (correct).
const GRID_EMOJI = /[🐟🐈]/u;
const CORRECT = "🐈";

export const catfishingParser: GameParser<CatfishingData> = {
  key: "catfishing",
  name: "Catfishing",

  detect(text: string): boolean {
    return HEADER_RE.test(text);
  },

  parse(text: string): ParsedResult<CatfishingData> {
    const headerMatch = text.match(HEADER_RE);
    if (!headerMatch) {
      throw new UnparsableTextError("This doesn't look like a Catfishing result.");
    }

    const [, puzzleNumberRaw, correctRaw, totalRaw] = headerMatch;
    const puzzleNumber = Number(puzzleNumberRaw);
    const correct = Number(correctRaw);
    const totalQuestions = Number(totalRaw);

    const grid = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => GRID_EMOJI.test(line));

    if (grid.length === 0) {
      throw new UnparsableTextError(
        "Found a Catfishing header but no emoji grid to go with it.",
      );
    }

    // One square per question; the catfish (🐈) marks a correct answer.
    const squares = grid.flatMap((row) => Array.from(row));
    const correctFromGrid = squares.filter((square) => square === CORRECT).length;

    // The header count and the grid should agree; disagreement means garbled text.
    if (correctFromGrid !== correct) {
      throw new UnparsableTextError(
        `Catfishing header says ${correct}/${totalQuestions} correct but the grid shows ${correctFromGrid} catfish.`,
      );
    }

    return {
      // A perfect run answers every question correctly.
      won: correct === totalQuestions,
      data: {
        puzzleNumber,
        correct,
        totalQuestions,
        grid,
      },
    };
  },
};
