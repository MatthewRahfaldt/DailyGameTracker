/**
 * Every supported game implements this interface (see docs/BACKLOG.md, Milestone 2).
 * `detect` should be cheap and specific enough that pasted text only matches one parser.
 */
export interface GameParser<TParsed = Record<string, unknown>> {
  /** Unique key stored on the Game record (Game.parserKey) and used to register this parser. */
  key: string;
  /** Human-readable name, e.g. "Wordle". */
  name: string;
  /** Return true if this text looks like this game's share output. */
  detect(text: string): boolean;
  /** Parse the text into a structured result. Throw a descriptive Error if parsing fails. */
  parse(text: string): ParsedResult<TParsed>;
}

export interface ParsedResult<TParsed = Record<string, unknown>> {
  /** Number of guesses taken, if the game has a fixed guess format. */
  guesses?: number;
  /** Whether the puzzle was won, if the game has a win/lose state. */
  won?: boolean;
  /** Game-specific structured data (e.g. the emoji grid, puzzle number). */
  data: TParsed;
}

export class UnparsableTextError extends Error {
  constructor(message = "Couldn't recognize this as a supported game's result.") {
    super(message);
    this.name = "UnparsableTextError";
  }
}
