// Shared types used by both the web app and the parsers package.
// These mirror prisma/schema.prisma — keep them in sync when the schema changes.

export interface User {
  id: string;
  email: string;
  name?: string | null;
  timezone: string;
  followCode: string;
}

export interface Game {
  id: string;
  slug: string;
  name: string;
  parserKey: string;
  /** Link to the game's own website, for making its name clickable in the UI. */
  url?: string | null;
}

export interface UserGame {
  userId: string;
  gameId: string;
}

export interface GameResult {
  id: string;
  userId: string;
  gameId: string;
  /** ISO date string (YYYY-MM-DD), in the user's timezone. */
  playedDate: string;
  guesses?: number | null;
  won?: boolean | null;
  rawText: string;
  parsedData?: Record<string, unknown> | null;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
}

export type GroupRole = "owner" | "admin" | "member";

export interface GroupMember {
  groupId: string;
  userId: string;
  role: GroupRole;
}

export interface GroupGame {
  groupId: string;
  gameId: string;
}

export interface Follow {
  followerId: string;
  followingId: string;
}

/**
 * Fixed emoji palette for reacting to a group member's game result (docs/BACKLOG.md,
 * Milestone 5 — "Group emoji reactions"). Kept as a closed set rather than free-form input so a
 * reaction is always one glyph, rendered consistently, and never an avenue for arbitrary text.
 */
export const REACTION_EMOJI = ["👍", "🎉", "🔥", "😂", "😮", "💀"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJI as readonly string[]).includes(value);
}

export interface Reaction {
  id: string;
  gameResultId: string;
  userId: string;
  emoji: ReactionEmoji;
}
