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

const WORDLE_CELLS = ["🟩", "🟨", "⬛"];

/** True when every cell in `cells` is the same string. Wrapped in its own function (rather than
 * an inline `.every()`) so TS doesn't narrow the caller's array to a single-literal tuple type. */
function allSame(cells: string[]): boolean {
  return cells.every((cell) => cell === cells[0]);
}

/** One 5-square Wordle row. `allGreen` forces the winning row; otherwise a green sweep is nudged off. */
function wordleRow(allGreen: boolean, random: () => number): string {
  if (allGreen) return "🟩".repeat(5);
  const cells: string[] = Array.from({ length: 5 }, () => WORDLE_CELLS[Math.floor(random() * WORDLE_CELLS.length)]);
  if (cells[0] === "🟩" && allSame(cells)) cells[0] = "⬛";
  return cells.join("");
}

/** A full Wordle grid: `rows` guesses, the last one all-green only when `won`. */
function wordleGrid(rows: number, won: boolean, random: () => number): string[] {
  return Array.from({ length: rows }, (_, index) => wordleRow(won && index === rows - 1, random));
}

const CONNECTIONS_COLORS = ["🟨", "🟩", "🟦", "🟪"];

/** A Connections grid: one solid row per solved group, plus one mixed row per mistake. */
function connectionsGrid(solvedGroups: number, mistakes: number, random: () => number): string[] {
  const rows: string[] = [];
  for (let i = 0; i < solvedGroups; i++) rows.push(CONNECTIONS_COLORS[i].repeat(4));
  for (let i = 0; i < mistakes; i++) {
    const cells: string[] = Array.from(
      { length: 4 },
      () => CONNECTIONS_COLORS[Math.floor(random() * CONNECTIONS_COLORS.length)],
    );
    if (allSame(cells)) {
      cells[0] = CONNECTIONS_COLORS[(CONNECTIONS_COLORS.indexOf(cells[0]) + 1) % CONNECTIONS_COLORS.length];
    }
    rows.push(cells.join(""));
  }
  return rows;
}

export const SAMPLE_GAMES: Game[] = [
  {
    id: "game-wordle",
    slug: "wordle",
    name: "Wordle",
    parserKey: "wordle",
    url: "https://www.nytimes.com/games/wordle/index.html",
  },
  {
    id: "game-connections",
    slug: "connections",
    name: "Connections",
    parserKey: "connections",
    url: "https://www.nytimes.com/games/connections",
  },
  {
    id: "game-nerdle",
    slug: "nerdle",
    name: "Nerdle",
    parserKey: "nerdle",
    url: "https://nerdlegame.com",
  },
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
      const puzzleNumber = 1000 + dates.indexOf(playedDate);

      let guesses: number | null;
      let parsedData: Record<string, unknown>;

      if (game.parserKey === "wordle") {
        const rows = won ? 2 + Math.floor(random() * 5) : 6;
        guesses = won ? rows : null;
        parsedData = { puzzleNumber, hardMode: false, grid: wordleGrid(rows, won, random) };
      } else if (game.parserKey === "connections") {
        const solvedGroups = won ? 4 : Math.floor(random() * 4);
        const mistakes = won ? Math.floor(random() * 4) : 4;
        const grid = connectionsGrid(solvedGroups, mistakes, random);
        guesses = grid.length;
        parsedData = { puzzleNumber, grid, mistakes, solvedGroups };
      } else {
        guesses = won ? 2 + Math.floor(random() * 5) : null;
        parsedData = { puzzleNumber };
      }

      results.push({
        id: `result-${game.slug}-${playedDate}`,
        userId,
        gameId: game.id,
        playedDate,
        guesses,
        won,
        rawText: `${game.name} ${playedDate} ${won ? `${guesses}/6` : "X/6"}`,
        parsedData,
      });
    }
  }

  return { games, assignedGameIds: games.map((game) => game.id), results };
}
