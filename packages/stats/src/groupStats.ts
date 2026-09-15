import type { GameResult } from "@dgt/types";
import type { DateString } from "./dates";
import { todayUtc } from "./dates";
import type { FeedActor } from "./feed";
import { computeGameStats, type GameStats } from "./stats";

/** One member's stats for a single group-assigned game. */
export interface MemberStanding {
  actor: FeedActor;
  stats: GameStats;
}

/**
 * One game's standings across a group's members, best-first (docs/BACKLOG.md, Milestone 5 —
 * "Group dashboard & shared stats").
 *
 * Reuses `computeGameStats` per member rather than inventing group-specific math — a group
 * leaderboard is just everyone's own stats for that game, ranked. Members with zero results for
 * this game are dropped (nothing to rank), so a group's leaderboard only ever lists people who've
 * actually played it.
 *
 * Ranked by current streak first (the thing a "keep it going" group cares about day to day), then
 * win rate (missing win/loss data — a score-based game like GeoSports — sorts after anyone with a
 * real rate, not above them), then games played as a final tiebreaker.
 */
export function buildStandings(
  members: ReadonlyArray<{ actor: FeedActor; results: readonly GameResult[] }>,
  gameId: string,
  today: DateString = todayUtc(),
): MemberStanding[] {
  return members
    .map((member) => ({
      actor: member.actor,
      stats: computeGameStats(member.results, gameId, today),
    }))
    .filter((standing) => standing.stats.played > 0)
    .sort((a, b) => {
      if (b.stats.currentStreak !== a.stats.currentStreak) {
        return b.stats.currentStreak - a.stats.currentStreak;
      }
      const aRate = a.stats.winRate ?? -1;
      const bRate = b.stats.winRate ?? -1;
      if (bRate !== aRate) return bRate - aRate;
      return b.stats.played - a.stats.played;
    });
}
