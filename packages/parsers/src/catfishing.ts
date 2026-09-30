import type { GameParser, ParsedResult } from "./types";
import { UnparsableTextError } from "./types";

export interface CatfishingData {
  puzzleNumber: number;
  /** Total points scored. Usually a whole number, but can end in .5 when one or more answers
   * were marked "close enough" (🥚, half credit) — see catfishing.net's help page. */
  correct: number;
  /** Total number of questions (the denominator, e.g. 10). */
  totalQuestions: number;
  /** Each row of 🐟 / 🥚 / 🐈 squares; one square per question. */
  grid: string[];
}

// e.g. "catfishing.net\n#797 - 1/10" or "catfishing.net\n#801 - 6.5/10" (a half point from one or
// more "close enough" answers) — "score / total questions".
const HEADER_RE = /catfishing\.net\s*\n\s*#(\d+)\s*-\s*([\d.]+)\/(\d+)/i;

// Each question is one square: a plain fish (wrong), the catfish (fully correct), or an egg
// ("close enough" — half credit).
const GRID_EMOJI = /[🐟🐈🥚]/u;
const CORRECT = "🐈";
const CLOSE_ENOUGH = "🥚";

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

    // One square per question: the catfish (🐈) is a full point, the egg (🥚, "close enough") is
    // half a point, and a plain fish (🐟) is zero.
    const squares = grid.flatMap((row) => Array.from(row));
    const fullyCorrect = squares.filter((square) => square === CORRECT).length;
    const closeEnough = squares.filter((square) => square === CLOSE_ENOUGH).length;
    const correctFromGrid = fullyCorrect + closeEnough * 0.5;

    // The header count and the grid should agree; disagreement means garbled text.
    if (correctFromGrid !== correct) {
      throw new UnparsableTextError(
        `Catfishing header says ${correct}/${totalQuestions} correct but the grid shows ${correctFromGrid} correct.`,
      );
    }

    return {
      // A perfect run answers every question fully correctly — any "close enough" half point
      // keeps this from counting as a win, even one that happens to round up to a perfect-looking
      // total.
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
