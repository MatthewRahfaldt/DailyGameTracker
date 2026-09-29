import type { GameResult } from "@dgt/types";
import { isRecord, readGrid, readNumber } from "./data";
import { formatInteger, mean } from "./format";
import { baseSummary, cardFields, commonStats, dailyResults, detail } from "./generic";
import type { GameModule } from "./types";

interface KrillionData {
  grid: string[];
  score: number;
}

function readKrillionResult(result: GameResult): KrillionData | null {
  if (!isRecord(result.parsedData)) return null;
  const score = readNumber(result.parsedData, "score");
  if (score === null) return null;
  // The grid is optional (packages/parsers/src/krillion.ts — some pastes omit it), so fall back
  // to an empty row rather than treating a missing grid as unreadable data.
  return { grid: readGrid(result.parsedData) ?? [], score };
}

/**
 * Krillion (krillion.io): a shared daily score, no win/loss state — see
 * packages/parsers/src/krillion.ts for the share-text format this reads.
 */
export const krillionModule: GameModule = {
  parserKey: "krillion",
  rankDirection: "desc",

  summarize(result, game) {
    const data = readKrillionResult(result);
    if (!data) return baseSummary(result, game);
    return {
      ...cardFields(result, game, data.grid),
      value: formatInteger(data.score),
      outcome: "score",
    };
  },

  stats(results, gameId, today) {
    const common = commonStats(results, gameId, today);
    const scores = dailyResults(results, gameId).flatMap((row) => {
      const data = readKrillionResult(row);
      return data ? [data.score] : [];
    });
    const average = mean(scores);
    const best = scores.length === 0 ? null : Math.max(...scores);

    return {
      gameId,
      ...common,
      line: average === null ? `${common.played} played` : `${formatInteger(average)} avg`,
      details: [
        detail("Played", common.played),
        detail("Avg score", formatInteger(average)),
        detail("Best", formatInteger(best)),
        detail("Best streak", common.bestStreak),
      ],
      rankValue: average,
    };
  },
};
