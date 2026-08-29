// Shared types used by both the web app and the parsers package.
// These mirror prisma/schema.prisma — keep them in sync when the schema changes.

export interface User {
  id: string;
  email: string;
  name?: string | null;
  timezone: string;
}

export interface Game {
  id: string;
  slug: string;
  name: string;
  parserKey: string;
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
