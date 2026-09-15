import type { GameResult } from "@dgt/types";
import { isRecord, readGrid } from "./data";
import { formatAverage, formatPercent, mean, plural } from "./format";
import { baseSummary, cardFields, commonStats, dailyResults, detail } from "./generic";
import type { GameModule } from "./types";

function readLandmarkrGrid(result: GameResult): string[] | null {
  return isRecord(result.parsedData) ? readGrid(result.parsedData) : null;
}

export const landmarkrModule: GameModule = {
  parserKey: "landmarkr",
  rankDirection: "asc",

  summarize(result, game) {
    const grid = readLandmarkrGrid(result);
    if (!grid) return baseSummary(result, game);
    if (result.won === true && typeof result.guesses === "number") {
      return {
        ...cardFields(result, game, grid),
        value: String(result.guesses),
        suffix: plural(result.guesses, " guess", " guesses"),
        outcome: "win",
      };
    }
    if (result.won === false) {
      return { ...cardFields(result, game, grid), value: "✗", outcome: "loss" };
    }
    return baseSummary(result, game);
  },

  stats(results, gameId, today) {
    const common = commonStats(results, gameId, today);
    const rows = dailyResults(results, gameId);
    const found = rows.filter((row) => row.won === true);
    const missed = rows.filter((row) => row.won === false).length;
    const decided = found.length + missed;
    const guesses = found
      .map((row) => row.guesses)
      .filter((count): count is number => typeof count === "number");
    const average = mean(guesses);

    return {
      gameId,
      ...common,
      line: average === null ? `${common.played} played` : `${formatAverage(average)} guesses`,
      details: [
        detail("Played", common.played),
        detail("Found", formatPercent(decided === 0 ? null : found.length / decided)),
        detail("Avg guesses", formatAverage(average)),
        detail("Best streak", common.bestStreak),
      ],
      rankValue: average,
    };
  },
};
