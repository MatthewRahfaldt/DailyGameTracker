import { readResultGrid } from "./data";
import { formatAverage, formatPercent, mean } from "./format";
import { baseSummary, cardFields, commonStats, dailyResults, detail } from "./generic";
import type { GameModule } from "./types";

export const wordleModule: GameModule = {
  parserKey: "wordle",
  rankDirection: "asc",

  summarize(result, game) {
    const grid = readResultGrid(result);
    if (!grid) return baseSummary(result, game);
    if (result.won === true && typeof result.guesses === "number") {
      return { ...cardFields(result, game, grid), value: String(result.guesses), suffix: "/6", outcome: "win" };
    }
    if (result.won === false) {
      return { ...cardFields(result, game, grid), value: "X", suffix: "/6", outcome: "loss" };
    }
    return baseSummary(result, game);
  },

  stats(results, gameId, today) {
    const common = commonStats(results, gameId, today);
    const rows = dailyResults(results, gameId);
    const wins = rows.filter((row) => row.won === true);
    const losses = rows.filter((row) => row.won === false).length;
    const decided = wins.length + losses;
    const winGuesses = wins
      .map((row) => row.guesses)
      .filter((guesses): guesses is number => typeof guesses === "number" && guesses >= 1 && guesses <= 6);
    const average = mean(winGuesses);

    return {
      gameId,
      ...common,
      line: average === null ? `${common.played} played` : `${formatAverage(average)} avg`,
      details: [
        detail("Played", common.played),
        detail("Win %", formatPercent(decided === 0 ? null : wins.length / decided)),
        detail("Avg guesses", formatAverage(average)),
        detail("Best streak", common.bestStreak),
      ],
      distribution: [
        ...[1, 2, 3, 4, 5, 6].map((n) => ({
          label: String(n),
          count: winGuesses.filter((guesses) => guesses === n).length,
        })),
        { label: "X", count: losses, loss: true },
      ],
      rankValue: average,
    };
  },
};
