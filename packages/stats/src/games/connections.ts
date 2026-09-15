import type { GameResult } from "@dgt/types";
import { isRecord, readGrid, readNumber } from "./data";
import { formatAverage, formatPercent, mean, plural } from "./format";
import { baseSummary, cardFields, commonStats, dailyResults, detail } from "./generic";
import type { GameModule } from "./types";

interface ConnectionsData {
  grid: string[];
  mistakes: number;
}

function readConnections(result: GameResult): ConnectionsData | null {
  if (!isRecord(result.parsedData)) return null;
  const grid = readGrid(result.parsedData);
  const mistakes = readNumber(result.parsedData, "mistakes");
  return grid && mistakes !== null ? { grid, mistakes } : null;
}

export const connectionsModule: GameModule = {
  parserKey: "connections",
  rankDirection: "asc",

  summarize(result, game) {
    const data = readConnections(result);
    if (!data || result.won == null) return baseSummary(result, game);
    const fields = cardFields(result, game, data.grid);
    if (result.won) {
      return {
        ...fields,
        value: String(data.mistakes),
        suffix: plural(data.mistakes, " mistake", " mistakes"),
        outcome: "win",
      };
    }
    return { ...fields, value: "✗", outcome: "loss" };
  },

  stats(results, gameId, today) {
    const common = commonStats(results, gameId, today);
    const rows = dailyResults(results, gameId);
    const solved = rows.filter((row) => row.won === true).length;
    const failed = rows.filter((row) => row.won === false).length;
    const mistakes: number[] = [];
    const solvedMistakes: number[] = [];
    for (const row of rows) {
      const data = readConnections(row);
      if (!data) continue;
      mistakes.push(data.mistakes);
      if (row.won === true) solvedMistakes.push(data.mistakes);
    }
    const average = mean(mistakes);
    const decided = solved + failed;

    return {
      gameId,
      ...common,
      line: average === null ? `${common.played} played` : `${formatAverage(average)} mistakes`,
      details: [
        detail("Played", common.played),
        detail("Solved", formatPercent(decided === 0 ? null : solved / decided)),
        detail("Avg mistakes", formatAverage(average)),
        detail("Perfect", solvedMistakes.filter((count) => count === 0).length),
        detail("Best streak", common.bestStreak),
      ],
      distribution: [
        ...[0, 1, 2, 3].map((n) => ({
          label: String(n),
          count: solvedMistakes.filter((count) => count === n).length,
        })),
        { label: "✗", count: failed, loss: true },
      ],
      rankValue: average,
    };
  },
};
