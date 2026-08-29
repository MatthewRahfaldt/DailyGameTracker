import type { GameParser, ParsedResult } from "./types";
import { UnparsableTextError } from "./types";
import { wordleParser } from "./wordle";

export * from "./types";
export { wordleParser };

/**
 * All registered parsers. Add new games here (see docs/BACKLOG.md, Milestone 2 —
 * "Implement parsers for the rest of your target games").
 */
export const parsers: GameParser[] = [wordleParser];

/** Find the first registered parser that recognizes this text, if any. */
export function detectParser(text: string): GameParser | undefined {
  return parsers.find((parser) => parser.detect(text));
}

/**
 * Parse pasted text by auto-detecting which game it belongs to.
 * Throws UnparsableTextError if no registered parser recognizes it.
 */
export function parseGameResult(text: string): { parser: GameParser; result: ParsedResult } {
  const parser = detectParser(text);
  if (!parser) {
    throw new UnparsableTextError();
  }
  return { parser, result: parser.parse(text) };
}
