# Daily Game Tracker

Track your stats and streaks for daily short games (Wordle-likes and friends). Paste a game's
share-text into the app, it parses the result automatically, and your progress shows up on a
calendar heatmap. Later: assign games to a group to auto-share stats with friends, and a native
mobile app on top of the same backend.

See [`docs/BACKLOG.md`](docs/BACKLOG.md) for the full milestone plan and issue backlog.

## Project layout

This is an npm-workspaces monorepo:

```
apps/
  web/              # Next.js app (frontend + API routes) — start here
packages/
  types/            # Shared TypeScript types (User, Game, GameResult, ...)
  parsers/          # Game-parsing logic: pluggable per-game parsers, unit-testable on their own
prisma/
  schema.prisma     # Database schema (Postgres via Prisma)
docs/
  BACKLOG.md        # Milestones + GitHub-issue-ready backlog
```

## Getting started

**Prerequisites:** Node.js 20+, npm, and a Postgres database (a free [Supabase](https://supabase.com)
or [Neon](https://neon.tech) project works fine — you don't need Postgres installed locally).

```bash
# 1. Install dependencies for every workspace package
npm install

# 2. Set up your environment
cp .env.example .env.local
cp .env.example .env       # Prisma CLI reads .env, not .env.local
# then fill in DATABASE_URL (and AUTH_SECRET once auth is wired up)

# 3. Generate the Prisma client and push the schema to your database
npm run db:generate
npm run db:migrate

# 4. Run the app
npm run dev
```

The app runs at http://localhost:3000.

## Useful scripts

- `npm run dev` — run the Next.js app in dev mode
- `npm run build` — build every workspace that has a build script
- `npm run lint` — lint every workspace
- `npm run test` — run the parser unit tests (and anything else with a test script)
- `npm run db:generate` / `npm run db:migrate` — Prisma client generation / migrations

## Contributing (team workflow)

- `main` is always deployable. Work on `feature/<short-name>` branches, open a PR, and get at
  least one of the other two people to approve before merging.
- Use the issue labels and milestones described in `docs/BACKLOG.md` to pick up work.
- The database schema in `prisma/schema.prisma` is the one thing worth a live discussion before
  changing — it's the foundation everything else builds on.

## License

MIT — see [`LICENSE`](LICENSE).
