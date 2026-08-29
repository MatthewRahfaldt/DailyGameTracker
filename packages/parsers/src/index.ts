import type { GameParser, ParsedResult } from "./types";
import { UnparsableTextError } from "./types";
import { wordleParser } from "./wordle";

export * from "./types";
export { wordleParser };

// The registry deliberately holds GameParser<unknown> rather than the bare GameParser (which
// defaults to GameParser<Record<string, unknown>>): a concrete per-game data type like
// WordleData isn't structurally assignable to Record<string, unknown> (TS requires an explicit
// index signature for that), so every future parser would hit the same build error wordleParser
// just did. Widening to `unknown` sidesteps it — callers here never touch `.data` directly, only
// each parser's own file does, with its own concrete type.

/**
 * All registered parsers. Add new games here (see docs/BACKLOG.md, Milestone 2 —
 * "Implement parsers for the rest of your target games").
 */
export const parsers: GameParser<unknown>[] = [wordleParser];

/** Find the first registered parser that recognizes this text, if any. */
export function detectParser(text: string): GameParser<unknown> | undefined {
  return parsers.find((parser) => parser.detect(text));
}

/**
 * Parse pasted text by auto-detecting which game it belongs to.
 * Throws UnparsableTextError if no registered parser recognizes it.
 */
export function parseGameResult(
  text: string
): { parser: GameParser<unknown>; result: ParsedResult<unknown> } {
  const parser = detectParser(text);
  if (!parser) {
    throw new UnparsableTextError();
  }
  return { parser, result: parser.parse(text) };
}