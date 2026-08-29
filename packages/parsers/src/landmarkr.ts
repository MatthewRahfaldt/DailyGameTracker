import type { GameParser, ParsedResult } from "./types";
import { UnparsableTextError } from "./types";

export interface LandmarkrData extends Record<string, unknown> {
  puzzleNumber: number;
  /** Each guess row, e.g. "⬛ ⬛ ⬛ ⬛ 🟨 🟩". */
  grid: string[];
  /** Total number of attempts shown (squares across the whole grid). */
  attempts: number;
}

// e.g. "Landmarkr #334 🌍".
const HEADER_RE = /Landmarkr\s+#(\d+)/i;

// Wordle-style feedback squares (space-separated in the share text).
const GRID_EMOJI = /[⬛⬜🟨🟩]/u;
const CORRECT = "🟩";

export const landmarkrParser: GameParser<LandmarkrData> = {
  key: "landmarkr",
  name: "Landmarkr",

  detect(text: string): boolean {
    return HEADER_RE.test(text);
  },

  parse(text: string): ParsedResult<LandmarkrData> {
    const headerMatch = text.match(HEADER_RE);
    if (!headerMatch) {
      throw new UnparsableTextError("This doesn't look like a Landmarkr result.");
    }

    const puzzleNumber = Number(headerMatch[1]);

    const grid = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => GRID_EMOJI.test(line));

    if (grid.length === 0) {
      throw new UnparsableTextError(
        "Found a Landmarkr header but no emoji grid to go with it.",
      );
    }

    // Flatten every square (rows are whitespace-separated) in guess order.
    const squares = grid
      .flatMap((row) => row.split(/\s+/))
      .filter((square) => square.length > 0);

    const winningIndex = squares.indexOf(CORRECT);
    const won = winningIndex !== -1;
    // Guesses = position of the correct square; undefined if never found.
    const guesses = won ? winningIndex + 1 : undefined;

    return {
      guesses,
      won,
      data: {
        puzzleNumber,
        grid,
        attempts: squares.length,
      },
    };
  },
};
