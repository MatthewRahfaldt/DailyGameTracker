import type { GameParser, ParsedResult } from "./types";
import { UnparsableTextError } from "./types";

export interface WordleData {
  puzzleNumber: number;
  hardMode: boolean;
  grid: string[];
}

// e.g. "Wordle 1,234 3/6" or "Wordle 1,234 X/6*"
const HEADER_RE = /Wordle\s+([\d,]+)\s+([1-6X])\/6(\*)?/i;

// A "row" is 5 of the wordle squares (also matches other emoji-grid games loosely,
// so detect() below also requires the header to match).
const GRID_EMOJI = /[⬛⬜🟨🟩]/;

export const wordleParser: GameParser<WordleData> = {
  key: "wordle",
  name: "Wordle",

  detect(text: string): boolean {
    return HEADER_RE.test(text);
  },

  parse(text: string): ParsedResult<WordleData> {
    const headerMatch = text.match(HEADER_RE);
    if (!headerMatch) {
      throw new UnparsableTextError("This doesn't look like a Wordle result.");
    }

    const [, puzzleNumberRaw, guessesRaw, hardModeRaw] = headerMatch;
    const puzzleNumber = Number(puzzleNumberRaw.replace(/,/g, ""));
    const won = guessesRaw !== "X";
    const guesses = won ? Number(guessesRaw) : undefined;

    const grid = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && GRID_EMOJI.test(line));

    if (grid.length === 0) {
      throw new UnparsableTextError("Found a Wordle header but no emoji grid to go with it.");
    }

    return {
      guesses,
      won,
      data: {
        puzzleNumber,
        hardMode: Boolean(hardModeRaw),
        grid,
      },
    };
  },
};
