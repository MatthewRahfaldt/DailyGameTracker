import type { Game, GameResult } from "@dgt/types";
import type { DateString } from "./dates";
import { todayUtc } from "./dates";
import type { FeedActor } from "./feed";
import { type GameStatsView, getGameModule } from "./games";

/** One member's stats for a single group-assigned game. */
export interface MemberStanding {
  actor: FeedActor;
  view: GameStatsView;
}

/**
 * One game's standings across a group's members, best-first (docs/BACKLOG.md, Milestone 5 —
 * "Group dashboard & shared stats").
 *
 * Ranked by the game's own metric (see packages/stats/src/games): Wordle by average guesses, lower
 * first; GeoSports by average score, higher first; and so on. Members whose metric is null (e.g.
 * only losses in Wordle) sort after everyone with one. Ties break by current streak, then games
 * played. Members with zero results for this game are dropped — nothing to rank.
 */
export function buildStandings(
  members: ReadonlyArray<{ actor: FeedActor; results: readonly GameResult[] }>,
  game: Game,
  today: DateString = todayUtc(),
): MemberStanding[] {
  const module = getGameModule(game.parserKey);
  return members
    .map((member) => ({ actor: member.actor, view: module.stats(member.results, game.id, today) }))
    .filter((standing) => standing.view.played > 0)
    .sort((a, b) => {
      const aValue = a.view.rankValue;
      const bValue = b.view.rankValue;
      if (aValue !== bValue) {
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        return module.rankDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      if (b.view.currentStreak !== a.view.currentStreak) {
        return b.view.currentStreak - a.view.currentStreak;
      }
      return b.view.played - a.view.played;
    });
}
