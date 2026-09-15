import type { Game, GameResult } from "@dgt/types";
import { type DateString, todayUtc } from "../dates";
import { genericModule } from "./generic";
import { wordleModule } from "./wordle";
import type { GameModule, GameStatsView, ResultSummary } from "./types";

export type {
  DistributionBar,
  GameModule,
  GameStatsView,
  Outcome,
  ResultSummary,
  StatDetail,
} from "./types";

const MODULES: readonly GameModule[] = [wordleModule];

const BY_PARSER_KEY = new Map(MODULES.map((module) => [module.parserKey, module]));

/** The module for a game's parser key, or the generic fallback. */
export function getGameModule(parserKey: string): GameModule {
  return BY_PARSER_KEY.get(parserKey) ?? genericModule;
}

export function summarizeResult(result: GameResult, game: Game): ResultSummary {
  return getGameModule(game.parserKey).summarize(result, game);
}

export function gameStatsView(
  results: readonly GameResult[],
  game: Game,
  today: DateString = todayUtc(),
): GameStatsView {
  return getGameModule(game.parserKey).stats(results, game.id, today);
}
