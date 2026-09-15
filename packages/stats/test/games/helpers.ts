import type { Game, GameResult } from "@dgt/types";
import type { GameStatsView } from "../../src/games/types";

export const TODAY = "2026-09-14";

export function game(parserKey: string, name = parserKey): Game {
  return { id: `game-${parserKey}`, slug: parserKey, name, parserKey, url: null };
}

export function result(
  parserKey: string,
  partial: Partial<GameResult> & { playedDate: string },
): GameResult {
  return {
    id: `r-${parserKey}-${partial.playedDate}`,
    userId: "user-1",
    gameId: `game-${parserKey}`,
    guesses: null,
    won: null,
    rawText: "",
    parsedData: null,
    ...partial,
  };
}

export function detailValue(view: GameStatsView, label: string): string | undefined {
  return view.details.find((entry) => entry.label === label)?.value;
}
