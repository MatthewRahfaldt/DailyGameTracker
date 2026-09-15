import type { GameResult } from "@dgt/types";
import { isRecord, readGrid, readNumber } from "./data";
import { formatAverage, formatInteger, mean } from "./format";
import { baseSummary, cardFields, commonStats, dailyResults, detail } from "./generic";
import type { GameModule } from "./types";

interface GeoScoreData {
  grid: string[];
  score: number;
  maxScore: number;
  correct: number;
}

function readGeoScore(result: GameResult): GeoScoreData | null {
  if (!isRecord(result.parsedData)) return null;
  const grid = readGrid(result.parsedData);
  const score = readNumber(result.parsedData, "score");
  const maxScore = readNumber(result.parsedData, "maxScore");
  const correct = readNumber(result.parsedData, "correct");
  if (!grid || score === null || maxScore === null || maxScore <= 0 || correct === null) return null;
  return { grid, score, maxScore, correct };
}

/** Shared by every Geo-family game (same share format, see packages/parsers/src/geoScore.ts). */
export function createGeoScoreModule(parserKey: string): GameModule {
  return {
    parserKey,
    rankDirection: "desc",

    summarize(result, game) {
      const data = readGeoScore(result);
      if (!data) return baseSummary(result, game);
      return {
        ...cardFields(result, game, data.grid),
        value: formatInteger(data.score),
        suffix: `/${formatInteger(data.maxScore)}`,
        outcome: data.score === data.maxScore ? "win" : "score",
      };
    },

    stats(results, gameId, today) {
      const common = commonStats(results, gameId, today);
      const scores = dailyResults(results, gameId).flatMap((row) => {
        const data = readGeoScore(row);
        return data ? [data] : [];
      });
      const average = mean(scores.map((entry) => entry.score));
      const best = scores.length === 0 ? null : Math.max(...scores.map((entry) => entry.score));

      return {
        gameId,
        ...common,
        line: average === null ? `${common.played} played` : `${formatInteger(average)} avg`,
        details: [
          detail("Played", common.played),
          detail("Avg score", formatInteger(average)),
          detail("Best", formatInteger(best)),
          detail("Avg correct", formatAverage(mean(scores.map((entry) => entry.correct)))),
          detail("Best streak", common.bestStreak),
        ],
        rankValue: average,
      };
    },
  };
}
