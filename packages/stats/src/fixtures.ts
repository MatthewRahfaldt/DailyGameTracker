import type { Game, GameResult } from "@dgt/types";
import { type DateString, addDays, enumerateDays } from "./dates";

/**
 * Deterministic sample data for building the heatmap and stats UI before the API exists
 * (docs/BACKLOG.md, Milestone 4). Same seed always yields the same results, so snapshots
 * and screenshots stay stable.
 */

/** mulberry32 — small, seeded, good enough for fixtures. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SAMPLE_GAMES: Game[] = [
  { id: "game-wordle", slug: "wordle", name: "Wordle", parserKey: "wordle" },
  { id: "game-connections", slug: "connections", name: "Connections", parserKey: "connections" },
  { id: "game-nerdle", slug: "nerdle", name: "Nerdle", parserKey: "nerdle" },
];

export interface FixtureOptions {
  /** Last day of the generated range (UTC). */
  end: DateString;
  /** How many days back to generate. */
  days?: number;
  /** Chance any given game is played on any given day. */
  playRate?: number;
  seed?: number;
  games?: Game[];
  userId?: string;
}

export interface Fixture {
  games: Game[];
  assignedGameIds: string[];
  results: GameResult[];
}

/**
 * Generate a year of plausible history: gaps, losses, and multi-game days, so the heatmap
 * shows a real spread of intensities rather than a solid block.
 */
export function makeFixture(options: FixtureOptions): Fixture {
  const {
    end,
    days = 365,
    playRate = 0.62,
    seed = 20260829,
    games = SAMPLE_GAMES,
    userId = "user-demo",
  } = options;

  const random = rng(seed);
  const results: GameResult[] = [];
  const dates = enumerateDays(addDays(end, -(days - 1)), end);

  for (const playedDate of dates) {
    for (const game of games) {
      if (random() > playRate) continue;

      // Roughly a 1-in-12 loss rate; winners skew toward 3-5 guesses.
      const won = random() > 0.08;
      const guesses = won ? 2 + Math.floor(random() * 5) : undefined;

      results.push({
        id: `result-${game.slug}-${playedDate}`,
        userId,
        gameId: game.id,
        playedDate,
        guesses: guesses ?? null,
        won,
        rawText: `${game.name} ${playedDate} ${won ? `${guesses}/6` : "X/6"}`,
        parsedData: { puzzleNumber: 1000 + dates.indexOf(playedDate) },
      });
    }
  }

  return { games, assignedGameIds: games.map((game) => game.id), results };
}
