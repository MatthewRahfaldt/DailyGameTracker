"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { parseGameResult, UnparsableTextError } from "@dgt/parsers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { todayInTimezone } from "@/lib/timezone";
import { PUZZLE_NUMBERED_GAMES, resolveGeoDateForPaste, resolvePuzzleNumberedDate } from "@/lib/dating";

export type SaveGameResultState =
  | { status: "error"; message: string }
  | { status: "saved"; gameName: string; guesses?: number; won?: boolean; playedDate: string }
  | {
      status: "needs-confirmation";
      gameName: string;
      guesses?: number;
      won?: boolean;
      proposedDate: string;
      reason: string;
    };

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
 *
 * Played-date, and this box's dual role as both the daily paste box *and* the way to backfill an
 * old result (docs/BACKLOG.md — historical import; there's no separate import page, by request —
 * "I was hoping that this would be all through the same box"):
 *   - The four puzzle-numbered games (Wordle, Connections, Catfishing, Landmarkr) always derive
 *     their date from the puzzle number itself via `resolvePuzzleNumberedDate` — see
 *     apps/web/src/lib/dating.ts — never from wall-clock "today". A puzzle number identifies
 *     exactly one calendar day no matter when it's pasted, so this is always `certain` and never
 *     needs confirmation, whether it's today's puzzle or one from months ago.
 *   - GeoSports/GeoHistory print only a year-less date label ("August 29th"), so there's no
 *     puzzle-number arithmetic to fall back on. `resolveGeoDateForPaste` takes the fast path —
 *     `certain`, today — when the label matches today's real date (the ordinary same-day paste,
 *     unchanged from before), and only asks the caller to confirm a proposed date when it
 *     doesn't, i.e. when this is clearly a backfill. When `confirmedDate` is passed in (the
 *     second round trip, after the UI showed that confirmation), it's used directly and this
 *     resolution step is skipped entirely.
 */
export async function saveGameResult(rawText: string, confirmedDate?: string): Promise<SaveGameResultState> {
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

  let playedDateIso: string;
  if (confirmedDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(confirmedDate) || Number.isNaN(new Date(`${confirmedDate}T00:00:00Z`).getTime())) {
      return { status: "error", message: "That doesn't look like a valid date (expected YYYY-MM-DD)." };
    }
    playedDateIso = confirmedDate;
  } else if (PUZZLE_NUMBERED_GAMES.has(parser.key)) {
    playedDateIso = (await resolvePuzzleNumberedDate(parser.key, game.id, result.data, user.timezone)).date;
  } else {
    const resolution = resolveGeoDateForPaste(result.data, todayInTimezone(user.timezone), user.assumeRecentImports);
    if (resolution.confidence === "needs-confirmation") {
      return {
        status: "needs-confirmation",
        gameName: parser.name,
        guesses: result.guesses,
        won: result.won,
        proposedDate: resolution.date,
        reason: resolution.reason,
      };
    }
    playedDateIso = resolution.date;
  }

  const playedDate = new Date(playedDateIso);
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
    playedDate: playedDateIso,
  };
}
