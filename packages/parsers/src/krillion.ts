import type { GameParser, ParsedResult } from "./types";
import { UnparsableTextError } from "./types";

export interface KrillionData {
  puzzleNumber: number;
  /** Points scored across the day's shared set of prompts (krillion.io/faq — "seven prompts a
   * day, same for everyone"; rarer answers are worth more). No fixed max is printed in the share
   * text itself, so this app doesn't assume one. */
  score: number;
  /** The single row of tier squares, one per prompt, rarest (🌟) to no answer (⬛). May be empty —
   * some pasted share texts only include the header and score line. */
  grid: string[];
}

// e.g. "Krillion #58 🦐" or Discord-bolded "**Krillion #7**" — the regex just looks for the
// substring, so surrounding markdown/emoji/chatter doesn't stop it from matching.
const HEADER_RE = /Krillion\s*#\s*([\d,]+)/i;

// The score is a standalone line, e.g. "340", separate from the "#58" puzzle number and from any
// chatter around the pasted text.
const SCORE_LINE_RE = /^(\d{1,4})$/;

// The tier squares seen in real share text, most-rare to no-answer (see krillion.io/faq).
const GRID_EMOJI = /[🌟🏮🦑🐟🤡🫧⬛]/u;

export const krillionParser: GameParser<KrillionData> = {
  key: "krillion",
  name: "Krillion",

  detect(text: string): boolean {
    return HEADER_RE.test(text);
  },

  parse(text: string): ParsedResult<KrillionData> {
    const headerMatch = text.match(HEADER_RE);
    if (!headerMatch) {
      throw new UnparsableTextError("This doesn't look like a Krillion result.");
    }
    const puzzleNumber = Number(headerMatch[1].replace(/,/g, ""));

    // The score line comes after the header line in every observed share format, so searching
    // only from there avoids ever mistaking a stray number elsewhere in pasted chatter for it.
    const lines = text.split(/\r?\n/).map((line) => line.trim());
    const headerLineIndex = lines.findIndex((line) => HEADER_RE.test(line));
    const scoreLine = lines.slice(headerLineIndex + 1).find((line) => SCORE_LINE_RE.test(line));
    if (scoreLine === undefined) {
      throw new UnparsableTextError("Found a Krillion header but no score line.");
    }
    const score = Number(scoreLine);

    const grid = lines.filter((line) => GRID_EMOJI.test(line));

    return {
      // No win/lose state — Krillion is scored, not pass/fail (see packages/stats's krillion
      // module, which renders it with the "score" outcome rather than a check/✗).
      data: {
        puzzleNumber,
        score,
        grid,
      },
    };
  },
};
