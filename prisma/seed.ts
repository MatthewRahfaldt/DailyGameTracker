// Seeds one `Game` row per parser registered in packages/parsers (docs/BACKLOG.md, "Implement
// parsers for the rest of your target games" / "Build the paste-box UI on the homepage").
//
// `GameResult.gameId` and `UserGame.gameId` are foreign keys into real `Game` rows — the parser
// registry alone (`packages/parsers`) isn't enough for `saveGameResult` to have anywhere to
// attach a saved result, so this needs to run once against every environment's database
// (including each teammate's local one) before pasting a result can actually save.
//
// Run with `npm run db:seed`. Safe to re-run any time: each game is upserted by its `slug`
// (which we set equal to the parser's `key`), so this never creates duplicates — and adding a
// new parser to the registry later means the next `db:seed` picks it up automatically, with
// nothing to edit here.

import { PrismaClient } from "@prisma/client";
import { parsers } from "@dgt/parsers";

const prisma = new PrismaClient();

// Each game's own website, keyed by parser key (docs/BACKLOG.md — "Link games to their
// websites"). Kept here rather than in packages/parsers: the parser only needs to recognize and
// parse a game's share text, not know where to send someone to go play it — that's presentation
// metadata, so it belongs with the rest of what this script seeds.
const GAME_URLS: Record<string, string> = {
  wordle: "https://www.nytimes.com/games/wordle/index.html",
  connections: "https://www.nytimes.com/games/connections",
  catfishing: "https://catfishing.net",
  landmarkr: "https://www.landmarkr.app",
  geosports: "https://geosports.app",
  geohistory: "https://geohistory.gg",
};

async function main() {
  for (const parser of parsers) {
    const url = GAME_URLS[parser.key];
    if (!url) {
      console.warn(
        `No URL configured for "${parser.name}" (${parser.key}) — add one to GAME_URLS above. Seeding it without a link for now.`,
      );
    }

    const game = await prisma.game.upsert({
      where: { slug: parser.key },
      update: { name: parser.name, parserKey: parser.key, url: url ?? null },
      create: { slug: parser.key, name: parser.name, parserKey: parser.key, url: url ?? null },
    });
    console.log(`Seeded game: ${game.name} (${game.slug})${game.url ? ` → ${game.url}` : ""}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
