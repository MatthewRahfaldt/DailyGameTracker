import type { Game as GameRow, GameResult as GameResultRow } from "@prisma/client";
import { normalizeDate } from "@dgt/stats";
import type { Game, GameResult } from "@dgt/types";

/** Prisma rows → the shared @dgt/types shapes every @dgt/stats function takes. */
export function toGame(row: GameRow): Game {
  return { id: row.id, slug: row.slug, name: row.name, parserKey: row.parserKey, url: row.url };
}

export function toGameResult(row: GameResultRow): GameResult {
  return {
    id: row.id,
    userId: row.userId,
    gameId: row.gameId,
    playedDate: normalizeDate(row.playedDate),
    guesses: row.guesses,
    won: row.won,
    rawText: row.rawText,
    parsedData: (row.parsedData as Record<string, unknown> | null) ?? null,
  };
}
