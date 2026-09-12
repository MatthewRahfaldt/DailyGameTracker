"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { parseGameResult, UnparsableTextError } from "@dgt/parsers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { todayInTimezone } from "@/lib/timezone";

export type SaveGameResultState =
  | { status: "error"; message: string }
  | { status: "saved"; gameName: string; guesses?: number; won?: boolean; playedDate: string };

/**
 * Parse pasted game-result text and persist it (docs/BACKLOG.md, Milestone 2 —
 * "Build the paste-box UI on the homepage").
 *
 * Storage design — store both, derived once at write time, never re-derived at read time:
 *   - `rawText` is saved byte-for-byte and kept forever. It's the one thing every other field
 *     can always be re-derived from, so it's what makes a future "a parser had a bug, reparse
 *     everyone's history" backfill script possible at all.
 *   - `guesses` / `won` become real columns (not just JSON) specifically because
 *     `packages/stats` filters and averages over them directly (see `computeGameStats`) —
 *     keeping them as plain columns means that code, and any future SQL-level aggregate query,
 *     never has to invoke a parser to answer "what's this user's win rate."
 *   - Everything else game-specific (grid, puzzle number, mistakes, …) goes in `parsedData` as
 *     JSON, so the heatmap/stats detail view can show it without re-parsing `rawText`.
 * The read side (packages/stats, the stats page) never imports @dgt/parsers at all — it only
 * ever reads columns that were already computed here.
 *
 * The client (PasteBox.tsx) already runs this same parser for instant feedback before this is
 * ever called — but this re-parses from the raw text server-side rather than trusting whatever
 * the client claims the parsed result was, so what actually lands in the database always
 * reflects the server's parser registry, never a possibly-stale client bundle.
 */
export async function saveGameResult(rawText: string): Promise<SaveGameResultState> {
  const session = await auth();
  if (!session?.user) {
    return { status: "error", message: "Sign in to save your result." };
  }

  let parsed: ReturnType<typeof parseGameResult>;
  try {
    parsed = parseGameResult(rawText);
  } catch (error) {
    const message =
      error instanceof UnparsableTextError
        ? error.message
        : "Something went wrong parsing that — check the text and try again.";
    return { status: "error", message };
  }

  const { parser, result } = parsed;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return { status: "error", message: "Couldn't find your account — try signing in again." };
  }

  const game = await prisma.game.findUnique({ where: { slug: parser.key } });
  if (!game) {
    return {
      status: "error",
      message: `"${parser.name}" isn't set up on the server yet (no Game row for "${parser.key}"). Run "npm run db:seed" and try again.`,
    };
  }

  const playedDate = new Date(todayInTimezone(user.timezone));
  const parsedData = result.data as Prisma.InputJsonValue;

  // Pasting a result for a game you don't already track starts tracking it — there's no
  // separate "assign yourself a game" UI yet (Milestone 3), so this is the on-ramp until then.
  await prisma.userGame.upsert({
    where: { userId_gameId: { userId: user.id, gameId: game.id } },
    update: {},
    create: { userId: user.id, gameId: game.id },
  });

  // Upserting on the (userId, gameId, playedDate) unique constraint is the duplicate-paste
  // protection: re-pasting today's result overwrites today's row instead of creating a second
  // one (see the constraint's comment in prisma/schema.prisma).
  await prisma.gameResult.upsert({
    where: { userId_gameId_playedDate: { userId: user.id, gameId: game.id, playedDate } },
    update: { guesses: result.guesses ?? null, won: result.won ?? null, rawText, parsedData },
    create: {
      userId: user.id,
      gameId: game.id,
      playedDate,
      guesses: result.guesses ?? null,
      won: result.won ?? null,
      rawText,
      parsedData,
    },
  });

  // Both the homepage (assigned-game state) and /stats (heatmap + per-game stats) read results
  // as Server Components, so they need to be told this data just changed.
  revalidatePath("/");
  revalidatePath("/stats");

  return {
    status: "saved",
    gameName: parser.name,
    guesses: result.guesses,
    won: result.won,
    playedDate: todayInTimezone(user.timezone),
  };
}
