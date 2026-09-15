import type { GameResult } from "@dgt/types";
import { isRecord, readGrid, readNumber } from "./data";
import { formatAverage, mean } from "./format";
import { baseSummary, cardFields, commonStats, dailyResults, detail } from "./generic";
import type { GameModule } from "./types";

interface CatfishingData {
  grid: string[];
  correct: number;
  total: number;
}

function readCatfishing(result: GameResult): CatfishingData | null {
  if (!isRecord(result.parsedData)) return null;
  const grid = readGrid(result.parsedData);
  const correct = readNumber(result.parsedData, "correct");
  const total = readNumber(result.parsedData, "totalQuestions");
  return grid && correct !== null && total !== null && total > 0 ? { grid, correct, total } : null;
}

export const catfishingModule: GameModule = {
  parserKey: "catfishing",
  rankDirection: "desc",

  summarize(result, game) {
    const data = readCatfishing(result);
    if (!data) return baseSummary(result, game);
    return {
      ...cardFields(result, game, data.grid),
      value: String(data.correct),
      suffix: `/${data.total}`,
      outcome: data.correct === data.total ? "win" : "score",
    };
  },

  stats(results, gameId, today) {
    const common = commonStats(results, gameId, today);
    const scores = dailyResults(results, gameId).flatMap((row) => {
      const data = readCatfishing(row);
      return data ? [data] : [];
    });
    const average = mean(scores.map((score) => score.correct));
    const best = scores.length === 0 ? null : Math.max(...scores.map((score) => score.correct));
    const total = scores.at(-1)?.total ?? 10;

    return {
      gameId,
      ...common,
      line: average === null ? `${common.played} played` : `${formatAverage(average)}/${total}`,
      details: [
        detail("Played", common.played),
        detail("Avg correct", average === null ? "—" : `${formatAverage(average)}/${total}`),
        detail("Best", best === null ? "—" : `${best}/${total}`),
        detail("Perfect", scores.filter((score) => score.correct === score.total).length),
        detail("Best streak", common.bestStreak),
      ],
      rankValue: average,
    };
  },
};
