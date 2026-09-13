import type { GameParser, ParsedResult } from "./types";
import { UnparsableTextError } from "./types";
import { wordleParser } from "./wordle";
import { connectionsParser } from "./connections";
import { catfishingParser } from "./catfishing";
import { landmarkrParser } from "./landmarkr";
import { geoSportsParser } from "./geosports";
import { geoHistoryParser } from "./geohistory";

export * from "./types";
export { wordleParser };
export { connectionsParser };
export { catfishingParser };
export { landmarkrParser };
export { geoSportsParser };
export { geoHistoryParser };

/**
 * All registered parsers. Add new games here (see docs/BACKLOG.md, Milestone 2 —
 * "Implement parsers for the rest of your target games").
 */
export const parsers: GameParser<unknown>[] = [
  wordleParser,
  connectionsParser,
  catfishingParser,
  landmarkrParser,
  geoSportsParser,
  geoHistoryParser,
];

/** Find the first registered parser that recognizes this text, if any. */
export function detectParser(text: string): GameParser<unknown> | undefined {
  return parsers.find((parser) => parser.detect(text));
}

/**
 * Parse pasted text by auto-detecting which game it belongs to.
 * Throws UnparsableTextError if no registered parser recognizes it.
 */
export function parseGameResult(text: string): { parser: GameParser<unknown>; result: ParsedResult<unknown> } {
  const parser = detectParser(text);
  if (!parser) {
    throw new UnparsableTextError();
  }
  return { parser, result: parser.parse(text) };
}
