# Daily Game Tracker — Project Plan & GitHub Backlog

_Last updated: 2026-09-19_

This doc is meant to live in the repo (e.g. as `PLANNING.md` or `docs/BACKLOG.md`) and to be a copy/paste source for GitHub Issues. Each item under "Backlog" is written as one issue: title, suggested labels, description, and acceptance criteria.

## 1. Product Recap

A web app (mobile app later) where users:

- Paste the text output of a daily game (Wordle-style share text, etc.) into a text box, which gets auto-parsed into a score.
- Assign themselves games to track.
- See their stats on a calendar heatmap showing how many of their assigned games they played each day.
- Can join/create **groups**. A group can be assigned a set of games, and that automatically shares each member's stats for those games with the rest of the group.

**Chosen v1 scope:** solo tracking only (paste → parse → store → calendar heatmap). Groups and sharing are v2. See Section 5 for the full milestone list.

## 2. Recommended Tech Stack

Chosen approach: **build the web app first, reuse the backend for a native app later.**

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | Next.js (React) + TypeScript | One framework for UI + API routes, huge community, easy to deploy, and the component logic (parser, heatmap) can be lifted into React Native later. |
| Styling | Tailwind CSS | Fast to build with 3 people without fighting over CSS conventions. |
| Backend | Next.js API routes (or a separate Node/Express service if it outgrows API routes) | Keeps one language (TypeScript) across the whole stack — easier for a 3-person team than juggling two languages. |
| Database | PostgreSQL | Relational data (users, games, groups, results) fits SQL well; easy to reason about joins for group stats. |
| ORM | Prisma | Type-safe queries, easy migrations, good with Postgres + TypeScript. |
| Auth | Auth.js (NextAuth) or Clerk | Don't hand-roll auth. Auth.js is free/open-source and flexible; Clerk is faster to set up if you don't mind a third-party service. Pick one in Issue "Choose & set up auth provider" below. |
| Hosting (app) | Vercel | Native fit for Next.js, free tier is enough for a hobby project. |
| Hosting (DB) | Supabase or Neon (managed Postgres) | Free tier, no server to babysit. |
| Mobile (later) | React Native (Expo) | Reuses your TypeScript types and API; Expo lowers the setup/build pain for a small team. |

This is a recommendation, not a requirement — swap any row your team is more comfortable with, but pick these **before** Milestone 0 is closed out so everyone builds against the same stack.

## 3. Suggested Repo Structure

Single repo (monorepo) to start — splitting frontend/backend into separate repos adds coordination overhead you don't need yet with 3 people.

```
daily-game-tracker/
  apps/
    web/              # Next.js app (frontend + API routes)
  packages/
    parsers/          # Game-parsing logic, shared & unit-testable on its own
    types/            # Shared TypeScript types (User, Game, Result, Group...)
  prisma/
    schema.prisma
  docs/
    BACKLOG.md         # this file
```

## 4. Team Workflow (3 people)

- **Branching:** `main` is always deployable. Work happens on `feature/<short-name>` branches, merged via PR.
- **PRs:** every PR needs at least 1 of the other 2 people to approve before merging. Keep PRs small (one issue = one PR where possible).
- **Issues & labels:** use labels like `area:frontend`, `area:backend`, `area:parsing`, `milestone:v1`, `milestone:v2`, `good-first-issue`.
- **Project board:** GitHub Projects board with columns `Backlog → In Progress → In Review → Done`, one card per issue.
- **Ownership split (suggested starting point, rotate as needed):**
  - Person A: backend/data model + auth
  - Person B: parsing engine + paste-box UI
  - Person C: calendar heatmap + stats UI
  - All three: pair on the DB schema up front since everything else depends on it.
- **Weekly sync:** a quick 15-30 min check-in (async in a group chat is fine) to unblock and re-divide work as milestones shift.

## 5. Milestones Overview

| # | Milestone | Scope |
|---|---|---|
| 0 | Project Setup | Repo, tooling, hosting, CI |
| 1 | Data Model & Auth | DB schema, login/signup |
| 2 | Parsing Engine | Paste box → parsed score |
| 3 | Self Game Assignment | Users pick games to track, daily dashboard |
| 4 | Calendar Heatmap & Stats | Visual progress, streaks |
| 5 | Groups (v2) | Create/join groups, shared game assignment, shared stats |
| 6 | Polish & Mobile-readiness | Responsive UI, notifications, API cleanup for mobile reuse |
| 7 | Native Mobile App (later) | React Native app on top of the same backend |

---

## 6. Backlog — Milestone 0: Project Setup

**Issue: Initialize monorepo and base Next.js + TypeScript project** ✅ done
- Labels: `area:setup`, `milestone:v1`
- Description: Scaffold the repo structure from Section 3, set up Next.js + TypeScript + Tailwind, commit a working "hello world" page.
- Acceptance criteria:
  - [x] Repo created, structure matches Section 3
  - [x] `npm run dev` runs a working blank homepage — long since grown well past blank, but confirmed working throughout this whole project
  - [x] README with setup instructions

**Issue: Choose and add an open-source LICENSE file** ✅ mostly done
- Labels: `area:setup`
- Description: Repo is going public, so it needs a license before anyone else can safely use or contribute to it (no license = "all rights reserved" by default, even if the code is visible). Recommendation: **MIT** — short, permissive, the most common choice for hobby/small-team projects, and well understood by anyone who'd want to use or contribute to it. Add the `LICENSE` file at the repo root (GitHub/GitLab both offer to generate MIT boilerplate with your name + year filled in), and a one-line mention in the README.
- Alternatives to consider instead, if any of these matter to your team:
  - `Apache 2.0` — same permissiveness as MIT, plus an explicit patent grant. Slightly more legal text, worth it if patents are a concern (unlikely for this project).
  - `GPL-3.0` / `AGPL-3.0` — "copyleft": anyone who modifies your code and distributes it (AGPL: or runs it as a hosted service) must also open-source their version. Use this only if you specifically want to prevent someone from taking the project closed-source/commercial without contributing back.
- Not legal advice — if you want certainty for a specific situation (e.g. someone else's game-output format, or a future commercial version), that's worth a real lawyer's opinion, but for a public hobby repo like this, MIT is the standard default.
- Acceptance criteria:
  - [x] `LICENSE` file added at repo root with the chosen license text — MIT, credited to all three of you
  - [x] README links to or mentions the license
  - [ ] All 3 contributors agree on the choice before other code is merged — can't verify a team conversation happened from here; worth a quick "hey, MIT ok with everyone?" if that hasn't explicitly come up

**Issue: Set up linting, formatting, and pre-commit checks** ✅ mostly done
- Labels: `area:setup`
- Description: ESLint + Prettier configured; optional pre-commit hook (husky) so formatting stays consistent across 3 people.
- Acceptance criteria:
  - [x] `npm run lint` works
  - [ ] Formatting is automatic or enforced on commit (Prettier not set up yet)
- Note: after upgrading to Next.js 16, `next lint` was removed (Next 16 breaking change) and `eslint-config-next@16.x`'s shareable config crashes with a "circular structure" error when bridged through `@eslint/eslintrc`'s `FlatCompat` (reproduced even from a clean `node_modules` reinstall — this is the package itself, not a local environment issue). Current `apps/web/eslint.config.mjs` works around it with a minimal flat config (plain JS/TS + React Hooks recommended rules, no `eslint-config-next` at all) — meaning Next-specific lint rules (e.g. flagging `<img>` instead of `next/image`) aren't enforced right now. Worth revisiting `eslint-config-next` once a version ships that works natively with flat config.
- Follow-up: set up Prettier + a pre-commit hook (husky/lint-staged) — not done yet.

**Issue: Set up CI (build + lint + test on PR)** ✅ mostly done
- Labels: `area:setup`
- Description: GitHub Actions workflow that runs lint/build/tests on every PR so broken code can't merge unnoticed.
- Acceptance criteria:
  - [x] PRs show a passing/failing check — `.github/workflows/ci.yml`, one `verify` job on `pull_request`/`push` to `main`
  - [ ] Failing build blocks merge (branch protection rule) — this is a GitHub repo *setting*, not a file, so it can't be scripted from here. Someone with admin on the repo needs to: **Settings → Branches → Add branch protection rule** for `main` → check "Require status checks to pass before merging" → select the `verify` check (it needs to have run at least once, e.g. on this PR, before it shows up in that list) → save.
- A workflow already existed from the original scaffold (Milestone 0) but predates almost everything built since — no `prisma generate` before build, no database at all, so the `build` step would have started failing the moment the app started importing `@prisma/client`. Rewritten to actually match the current app:
  - **Prisma-aware now:** `npm run db:generate` runs before build (Next needs the generated client's types), and `npm run db:deploy` (`prisma migrate deploy` — the non-interactive, CI/production-safe counterpart to `migrate dev`) applies the committed `prisma/migrations/` history against a real ephemeral `postgres:16` service container for the job. This is a genuine check, not just a type-check: it proves the migration history actually applies cleanly to a fresh database, which local dev alone doesn't guarantee (your local Supabase DB has been migrated incrementally the whole time, so a subtly broken migration could pass locally and only fail for a teammate — or in production — starting from zero).
  - **Seed check:** `npm run db:seed` also runs against that same fresh database, so a broken `prisma/seed.ts` (e.g. a bad `GAME_URLS` entry) fails CI instead of surfacing the next time someone sets up a new environment.
  - **Build env:** `next build` and `prisma generate`/`deploy` need `DATABASE_URL`/`AUTH_SECRET`/etc. to *exist*, but nothing in the app actually needs them to be real at build time — every page that touches the database or auth is already dynamically rendered (see `auth()` usage / `export const dynamic` across `apps/web`), so these are placeholder values, not secrets. `DATABASE_URL` specifically does point at something real, but only within the job: the ephemeral Postgres service container above.
- ⚠️ **I couldn't write `.github/workflows/ci.yml` myself** — the device bridge refuses writes to anything under `.github/workflows/` (workflow files can run with repo secrets, so that's a deliberate guardrail, not a bug). It's attached in the conversation instead — copy it into place at `.github/workflows/ci.yml` (replacing what's there) yourself.
- Recommend opening a small test PR after this lands to actually watch the `verify` check run once, both to confirm it's green and so it shows up as a selectable status check when setting up the branch protection rule above. I wasn't able to run this workflow myself before handing it over (no way to execute GitHub Actions from here) — the Postgres-service-container and Prisma steps follow standard, well-documented patterns, but this is the one piece of this session's work that's genuinely unverified until it runs for real.

**Issue: Provision hosting and database** 🚧 in progress — resumed
- Labels: `area:setup`
- Description: Create Vercel project (connected to repo) and managed Postgres instance (Supabase/Neon). Store connection secrets properly (Vercel env vars, `.env.local` template in repo).
- Acceptance criteria:
  - [ ] `main` auto-deploys to a live URL on push
  - [ ] App can connect to the database from both local dev and the deployed environment
- The database (Supabase) has been provisioned and in use locally this whole project — what's actually missing is the Vercel side, which needs a Vercel account and clicking through their dashboard (nothing I can do from here). Prep work done so the deploy itself goes smoothly once you get there:
  - **`prisma/schema.prisma` now has a `directUrl`, alongside `url`**, specifically for Supabase + Vercel: Vercel's serverless functions can spin up many concurrent short-lived instances, each opening its own DB connection, which exhausts Postgres's connection limit fast without pooling. `url` (`DATABASE_URL`) should be Supabase's *pooled* connection string in production (port 6543, "Transaction" mode); `directUrl` (`DIRECT_URL`) is what the Prisma CLI itself needs for schema changes (`migrate`/`db seed`), which can't go through a pooler — Supabase's *direct* connection string (port 5432). Locally these can just be the same value (no pooler in the way yet) — `.env.example` explains this inline.
  - **`npm install` now regenerates the Prisma client automatically** (root `postinstall` script) — matters for Vercel specifically, since every deploy runs a fresh `npm install` with no pre-existing `node_modules` to reuse.
  - **`apps/web` has a `vercel-build` script** (`prisma migrate deploy && next build`) — Vercel auto-detects and uses this in place of `build` when present, so every deploy applies any new migrations to production *before* building, automatically. Nobody needs to remember to run migrations against production by hand.
  - **README has a Deployment section** pointing back here.
  - Needed one more small addition to `.github/workflows/ci.yml` (a `DIRECT_URL` env var, since the schema now references it) — same file-write restriction as before, so this went out as a conversation attachment again rather than a direct write.
- What's left, walking through Vercel's dashboard:
  1. vercel.com → sign in with the same GitHub account/org as the repo → **Add New… → Project** → import `MatthewRahfaldt/DailyGameTracker` (grant Vercel repo access if it asks).
  2. On the import screen, click **Edit** next to Root Directory and set it to `apps/web` — required since this is a monorepo; Vercel's Next.js detection and the `vercel-build` script above both depend on this being set correctly. Framework Preset should auto-detect "Next.js" — leave Build/Install/Output commands on their defaults.
  3. Expand **Environment Variables** and add, for Production (and Preview if you want PR preview deploys to work too): `DATABASE_URL` (Supabase pooled string, port 6543), `DIRECT_URL` (Supabase direct string, port 5432), `AUTH_SECRET` (generate a **new** one for production — `npx auth secret` — don't reuse your local dev one), `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`, `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`.
  4. Click **Deploy**.
  5. Once you have the production URL, go back to the GitHub OAuth App and the Google Cloud Console OAuth client and add an authorized redirect URI for it (`https://<your-domain>/api/auth/callback/github` and `.../google`) — alongside the existing `localhost:3000` ones, not replacing them.
  6. Push to `main` (or merge a PR) to confirm auto-deploy actually fires on its own.
- I wasn't able to do any of steps 1–6 myself (no access to your Vercel account) or verify the `vercel-build`/`directUrl` setup against a real deploy — same caveat as the CI workflow: this follows standard, well-documented Prisma + Supabase + Vercel patterns, but it's unverified until it actually runs. Let me know what happens (or paste a failed build log) and I'll help debug.
- See "Enable Supabase Row Level Security" below, done alongside this — worth applying (`npm run db:migrate` picks up the new migration) before or right after the first deploy, since it closes off Supabase's public API regardless of whether the app itself is live yet.

**Issue: Enable Supabase Row Level Security** ✅ done
- Labels: `area:backend`, `area:setup`
- Description: Supabase's dashboard flags every table without RLS as a security warning — not because this app's own access is unsafe (it isn't; see below), but because Supabase auto-exposes every `public`-schema table through its own REST/GraphQL API (PostgREST), reachable by anyone with the project URL and its public "anon" key, completely independent of anything apps/web does.
- Acceptance criteria:
  - [x] Every table has RLS enabled — `prisma/migrations/20260919023311_enable_row_level_security/migration.sql`, one `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` per table, applied like any other migration (`npm run db:migrate` locally, `db:deploy` in CI/production)
  - [x] The app itself keeps working unaffected — confirmed by how Supabase's roles work, not by a live test I can run from here (see caveat below)
- **Important nuance, worth understanding before assuming this "adds row-level security" in the way the name usually implies**: this does *not* add per-user policies like "a user can only see their own GameResult rows." That style of RLS policy is written against `auth.uid()`, which Supabase's own Auth (GoTrue) sets from the JWT it issues — but this app doesn't use Supabase Auth at all. Sign-in is Auth.js (GitHub/Google/Resend), with its own database-backed `Session` table; `auth.uid()` would just be `NULL` for every request this app ever makes, so a policy written against it wouldn't express anything meaningful. All per-user authorization continues to live exactly where it already did: the `auth()`/`requireRole()` checks in `apps/web`'s Server Actions.
- What this migration actually does: enables RLS with **zero policies** on every table, which makes each one deny-by-default for the `anon`/`authenticated` Postgres roles PostgREST uses — shutting that unused API path completely. It does not touch `apps/web`, because the Postgres role in `DATABASE_URL`/`DIRECT_URL` is Supabase's default `postgres` role, which has `BYPASSRLS` — every Prisma query keeps working exactly as before.
- Unverified from here, same as the hosting item above: I can't connect to your actual Supabase project to confirm `BYPASSRLS` on your `postgres` role or watch the app run post-migration. This is standard, documented Postgres/Supabase behavior, but worth a quick manual smoke test (paste a result, check the feed, open a group) right after running the migration, just to confirm nothing broke.
- If a real Supabase Auth integration is ever added on top of Auth.js later, per-row `auth.uid()` policies become meaningful and can be layered onto these same tables then — this migration doesn't preclude that, it's just not applicable yet.

**Issue: Create GitHub Project board and issue labels**
- Labels: `area:setup`
- Description: Set up the board/columns and labels described in Section 4, and paste in the initial backlog from this doc.
- Acceptance criteria:
  - [ ] Board exists with the 4 columns
  - [ ] Labels created
  - [ ] Milestone 0–4 issues added to the board

## 7. Backlog — Milestone 1: Data Model & Auth

**Issue: Design initial database schema** ✅ mostly done
- Labels: `area:backend`, `milestone:v1`
- Description: Define Prisma schema for `User`, `Game`, `GameResult`, `UserGame` (assignment), and stub out `Group`/`GroupGame` tables even though groups are v2, so the v1 schema doesn't need a breaking migration later.
- Acceptance criteria:
  - [ ] Schema reviewed by all 3 people (this is the one thing worth a live discussion, not just a PR) — worth an explicit "does anyone want to change anything" pass now that it's been live a while, even informally
  - [x] Migration runs cleanly against the dev database
  - [x] Basic seed script with a couple of sample games — `prisma/seed.ts`, added alongside the paste-box work; seeds one `Game` row per registered parser (6 games) rather than a hand-picked couple, so it never drifts out of sync with `packages/parsers`

**Issue: Choose & set up auth provider** ✅ done
- Labels: `area:backend`, `milestone:v1`
- Description: Wire up Auth.js or Clerk (pick one from Section 2) for email/password or OAuth (e.g. Google) sign-in.
- Acceptance criteria:
  - [x] User can sign up, log in, log out
  - [x] Signed-in user has a session usable in both pages and API routes
- Note: implemented with Auth.js v5, GitHub as the first provider. Originally JWT-only sessions with a manual upsert callback; superseded by the Prisma-adapter/database-sessions setup added for email sign-in below, which GitHub and Google now also use.

**Issue: Add Google OAuth as a second sign-in option** ✅ done
- Labels: `area:backend`, `milestone:v1`
- Description: Add Google as a second provider alongside GitHub (`src/auth.ts`) so people without a GitHub account can still sign in. Auth.js v5 reads `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` automatically, same convention as the GitHub provider — no other config changes needed. Requires creating an OAuth client in Google Cloud Console (APIs & Services → Credentials → Create OAuth client ID → Web application), with authorized redirect URI `http://localhost:3000/api/auth/callback/google` for local dev (plus your deployed URL's equivalent once hosted).
- Acceptance criteria:
  - [x] "Sign in with Google" button works end-to-end, landing on the same session/user record as GitHub sign-in would for the same email
  - [x] `.env.example` documents `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`

**Issue: Email magic-link sign-in** ✅ done
- Labels: `area:backend`, `milestone:v1`
- Description: Let a user log in or create an account with just their email — no password. Implemented via Auth.js's `Resend` provider (email provider, sends a one-time sign-in link) rather than a traditional email+password flow, since that avoids ever storing/hashing passwords or building a "forgot password" flow. This required switching the whole auth setup from JWT-only sessions to the Prisma adapter (database-backed sessions), because the magic-link provider needs somewhere durable to store one-time verification tokens — see the new `Account`/`Session`/`VerificationToken` models in `prisma/schema.prisma`. GitHub and Google sign-in now ride on the same database-backed sessions as a result.
- Setup needed: create a free account at resend.com, generate an API key, set `AUTH_RESEND_KEY` in `.env`/`.env.local`. `AUTH_EMAIL_FROM` defaults to Resend's testing sender (`onboarding@resend.dev`), which works without verifying a domain — **but on the free tier that testing sender can only deliver to the email address your Resend account was created with**. Each teammate will need their own Resend account (or the team verifies one shared sending domain) before magic-link sign-in works for all three of you.
- Acceptance criteria:
  - [x] Entering an email and submitting sends a real sign-in link (verify with a Resend account you can receive mail at)
  - [x] Clicking the link signs the user in and creates a `User` row if one didn't already exist for that email
  - [x] `npm run db:migrate` run with the updated schema (adds `Account`/`Session`/`VerificationToken` tables and `emailVerified`/`image` on `User`)
  - [x] `.env.example` documents `AUTH_RESEND_KEY` / `AUTH_EMAIL_FROM`
- ⚠️ **Heads up for whoever pulls this next:** if you signed in with GitHub/Google *before* this change, your browser has a leftover JWT session cookie from the old (pre-adapter) auth setup. Now that sessions are database-backed, that stale cookie makes any sign-in attempt fail with a generic `Configuration` error (Auth.js tries to delete a session row that never existed). Fix: clear `authjs.*`/`next-auth.*` cookies for `localhost:3000` (DevTools → Application → Cookies) or just test in an incognito window, then try again.

**Issue: Build basic user profile** ✅ done
- Labels: `area:frontend`, `milestone:v1`
- Description: Minimal profile page (display name, timezone setting — needed later for "which day" a result counts toward).
- Acceptance criteria:
  - [x] User can view/edit display name and timezone
  - [x] Timezone is stored and used for date calculations elsewhere in the app — used by `todayInTimezone()` (`apps/web/src/lib/timezone.ts`) in `saveGameResult` to decide which calendar day a paste counts toward.
- Note: `/profile` is a Server Component gated by `auth()` (redirects home if signed out), reads/writes the current `User` row directly via Prisma. Timezone dropdown is populated from `Intl.supportedValuesOf("timeZone")` — the full real IANA list, nothing hardcoded to maintain. Linked from the "Profile" button next to sign-out in `AuthStatus`.

## 8. Backlog — Milestone 2: Parsing Engine

**Issue: Define pluggable parser interface** ✅ done
- Labels: `area:parsing`, `milestone:v1`
- Description: In `packages/parsers`, define a common interface (e.g. `detect(text): boolean` + `parse(text): ParsedResult`) so each game's parsing logic is self-contained and new games can be added without touching shared code.
- Acceptance criteria:
  - [x] Interface + a game registry (list of available parsers) exists
  - [x] Unit test harness set up for parsers (pure functions, easy to test with sample text fixtures)
- Note: `GameParser<TParsed>` / `ParsedResult<TParsed>` live in `packages/parsers/src/types.ts`; the registry (`parsers` array, `detectParser`, `parseGameResult`) lives in `src/index.ts`. Registry is typed `GameParser<unknown>[]` (not bare `GameParser[]`, which would default to `GameParser<Record<string, unknown>>` and reject concrete data types — see the Milestone-2 gotcha noted earlier in this doc). Test harness is `node:test` + `node:assert/strict`, run via `tsx --test test/*.test.ts`.

**Issue: Implement Wordle-style parser (reference implementation)** ✅ done
- Labels: `area:parsing`, `milestone:v1`
- Description: Parse standard Wordle share text (puzzle number, guesses out of 6, emoji grid) into a score + raw grid. Use this as the template for adding more games.
- Acceptance criteria:
  - [x] Correctly parses guess count, win/loss, and date/puzzle number
  - [x] Covers edge cases: failed attempt (X/6), hard mode indicator
  - [x] Unit tests with real sample outputs

**Issue: Implement parsers for the rest of your target games** ✅ done
- Labels: `area:parsing`, `milestone:v1`
- Description: One of the other two devs on the repo picked this up and merged parsers for Connections, Catfishing, Landmarkr, GeoSports, and GeoHistory (`packages/parsers/src/{connections,catfishing,landmarkr,geosports,geohistory}.ts`).
- Acceptance criteria:
  - [x] Each supported game has a parser + tests (40/40 tests passing across all six parsers as of this merge)
  - [x] Unsupported/garbled paste shows a clear "couldn't parse this" error instead of failing silently (`UnparsableTextError`, thrown consistently by every parser)
- Note: GeoSports and GeoHistory share one implementation — `src/geoScore.ts` exports `createGeoScoreParser(key, name)`, a factory for the "Geo" family (shared header/score/grid shape), and `geosports.ts` / `geohistory.ts` are two one-line call sites. Worth following this factory pattern if more Geo-family games (GeoScience, etc.) get added later, instead of copy-pasting a new file each time.
- Still open: no `Game` rows exist yet in the database with `parserKey` values matching these six keys (`wordle`, `connections`, `catfishing`, `landmarkr`, `geosports`, `geohistory`) — that seeding is naturally part of "Build the paste-box UI on the homepage" below, since that's the first feature that needs the registry wired to real `Game` records.

**Issue: Build the paste-box UI on the homepage** ✅ done
- Labels: `area:frontend`, `milestone:v1`
- Description: Large textarea on the main page. On paste/submit, run text through the parser registry (auto-detect game, or let user confirm which game if ambiguous), show the parsed result for confirmation, then save.
- Acceptance criteria:
  - [x] Paste → parsed preview → confirm → saved, in one smooth flow — simplified to paste → click "Parse & save result" → saved, since a separate confirm step didn't add much once the button click already is the confirmation. Easy to split back out later if a wrong-game auto-detect turns out to be a real problem.
  - [x] Clear error state for unrecognized text
  - [x] Duplicate-paste protection (don't double-count the same day's result if pasted twice) — `GameResult` is upserted on the `(userId, gameId, playedDate)` unique constraint, so re-pasting the same day overwrites instead of duplicating.
- **Storage design decision:** store both raw and parsed data, derived once at write time — not "store raw text only and reparse on every read." `rawText` is saved byte-for-byte and kept forever (it's the source of truth, and what makes a future "a parser had a bug, reparse everyone's history" backfill script possible). `guesses`/`won` are extracted into real columns and the rest of the game-specific shape (grid, puzzle number, mistakes…) goes into `parsedData` as JSON — both computed once in `saveGameResult` (`apps/web/src/lib/game-results.ts`), never recomputed on read. The reasoning: `packages/stats` (heatmap, streaks, win rate, average guesses) already existed built entirely against plain `guesses`/`won` fields with zero calls into `@dgt/parsers` — reparsing on every read would mean every heatmap/stats page load re-runs a parser over every row in range instead of a handful of array reduces, and would rule out ever pushing an aggregate (like a group leaderboard's average guesses) down into SQL. The schema (`prisma/schema.prisma`) already had both `rawText` and `parsedData` columns from Milestone 1 — this issue just wires something into them.
- Implementation notes:
  - `apps/web/src/lib/timezone.ts` — `todayInTimezone(timezone)` turns "now" into a `YYYY-MM-DD` in the user's own zone (`Intl.DateTimeFormat("en-CA", { timeZone })`), so what day a result counts toward uses the `User.timezone` set on `/profile`, not server UTC. This is the first thing to actually *use* that field.
  - `apps/web/src/lib/game-results.ts` — `saveGameResult` Server Action. Re-parses `rawText` server-side rather than trusting whatever the client already parsed for its instant preview (`PasteBox.tsx` still parses client-side first, purely for snappy feedback on garbled text — but only the server's parse is ever persisted).
  - Pasting a result for a game you don't already track auto-creates its `UserGame` row — there's no "assign yourself a game" UI yet (Milestone 3 below), so this is the on-ramp until then. Worth revisiting once that UI exists: should un-assigning also stop this auto-track behavior, or only affect the heatmap/stats view?
  - New setup step for everyone pulling this: run `npm install` (adds `@dgt/stats` as an explicit dependency of `apps/web`, plus root `tsx`), then `npm run db:seed` once per environment (including each teammate's local DB) — `prisma/seed.ts` upserts one `Game` row per registered parser, and `GameResult`/`UserGame` are foreign keys into those rows, so pasting a result can't save anywhere without it. Re-running the seed is always safe (idempotent upsert by slug), and a newly-added parser is picked up automatically next time it's run.

## 9. Backlog — Milestone 3: Self Game Assignment

**Issue: Build "assign games to yourself" UI** ✅ done
- Labels: `area:frontend`, `milestone:v1`
- Description: A page listing available games where a user can toggle which ones they're tracking.
- Acceptance criteria:
  - [x] User can add/remove games from their tracked list — `/games` (`apps/web/src/app/games/page.tsx`), one Track/Untrack button per registered `Game`, backed by `toggleGameTracking` (`app/games/actions.ts`)
  - [x] Change reflects immediately in their daily dashboard — the toggle action revalidates `/`, `/games`, and `/stats` together
- Note: pasting a result for a game you don't track already auto-tracks it (see "Build the paste-box UI on the homepage" above), so in practice this page is mostly for the "remove" half, or turning a game on before you've ever played it. Untracking a game only affects whether it shows up in the Today checklist / heatmap denominator going forward — it never deletes past `GameResult` rows (same "hide, don't delete" behavior `buildHeatmap` already had for the demo data).

**Issue: Build daily dashboard view** ✅ done
- Labels: `area:frontend`, `milestone:v1`
- Description: "Today" view showing each assigned game and whether it's been played yet today (using the user's timezone).
- Acceptance criteria:
  - [x] Shows correct played/not-played state per assigned game for "today" — `TodayDashboard` (`apps/web/src/components/TodayDashboard.tsx`), rendered on the homepage below the paste box. Self-contained like `AuthStatus` (calls `auth()` itself, renders nothing when signed out) rather than the homepage needing to branch on session state.
  - [x] Updates immediately after a successful paste/parse — `saveGameResult` already revalidates `/`; nothing extra needed here.
- Note: "today" is computed with the same `todayInTimezone(user.timezone)` helper `saveGameResult` uses to decide which day a paste counts toward (`apps/web/src/lib/timezone.ts`), so the checklist can never disagree with what actually got saved. Status text is generic ("Won" / "Lost" / "Played" / "Won in N") rather than hardcoding a "/6" guesses format; `CalendarHeatmap.tsx`'s day-detail panel used to hardcode "X/6" / "N/6" for every game (wrong for Catfishing, out of 10, or the Geo-family games, a score not a guess count) — fixed to the same generic phrasing while touching that file for the game-links issue below.

**Issue: Link each game's name to its website** ✅ done
- Labels: `area:frontend`, `area:backend`, `milestone:v1`
- Description: Make a game's name clickable everywhere it appears in the UI, opening the actual game's website in a new tab — added after the fact (not in the original plan), by request.
- Acceptance criteria:
  - [x] `Game` has a `url` field (`prisma/schema.prisma`), nullable so a game without a known URL doesn't break anything
  - [x] `prisma/seed.ts` sets a real URL for all 6 current games (`GAME_URLS` map, keyed by parser key — kept in the seed script rather than `packages/parsers`, since a parser only needs to recognize/parse share text, not know where to send someone to play)
  - [x] Every place a game's name is shown links to it: `/games`, the Today checklist, the heatmap's day-detail panel, and the per-game stats table — via one shared `GameLink` component (`apps/web/src/components/GameLink.tsx`) so the behavior (opens in a new tab, falls back to plain text with no `url`) stays consistent instead of reimplemented four times
- **Requires a migration**: this adds a column, so run `npm run db:migrate` (review the migration name it prompts for) and then `npm run db:seed` again after pulling — existing `Game` rows get a `url` from the reseed, nothing is lost.
- Game URLs used: Wordle → nytimes.com/games/wordle, Connections → nytimes.com/games/connections, Catfishing → catfishing.net, Landmarkr → landmarkr.app, GeoSports → geosports.app, GeoHistory → geohistory.gg. Verified each is a real, currently-live site before hardcoding it (the four non-NYT ones aren't well-known, so worth double-checking they're still current if this drifts).

## 10. Backlog — Milestone 4: Calendar Heatmap & Stats

**Issue: Build calendar heatmap component** ✅ done
- Labels: `area:frontend`, `milestone:v1`
- Description: GitHub-contributions-style heatmap where each day's intensity reflects fraction of assigned games played that day.
- Acceptance criteria:
  - [x] Renders a full year (or scrollable month view) correctly
  - [x] Color intensity scales with completion ratio
  - [x] Clicking a day shows which games were played and their scores
- Note: another dev built `packages/stats` (`buildHeatmap`, `toWeeks`, UTC-only date math in `dates.ts`) and `CalendarHeatmap.tsx` against generated fixture data (`apps/web/src/lib/demo-data.ts`) before the paste-box saved anything real. This issue's remaining piece — wiring it to real `GameResult` rows for a signed-in user — is done now as part of the same change that wired up the paste box: `getStatsView` (same file) loads real `UserGame`/`GameResult` rows when signed in and only falls back to generated demo data when signed out. Not yet manually verified end-to-end against a live paste → real heatmap cell — worth checking after pulling this and running the db seed.

**Issue: Per-game stats (streaks, averages)** ✅ done
- Labels: `area:backend`, `area:frontend`, `milestone:v1`
- Description: For each tracked game, compute current streak, best streak, average guesses/score, win rate.
- Acceptance criteria:
  - [x] Stats page per game shows the above
  - [x] Streak logic correctly handles the user's timezone and missed days — timezone is resolved once, at save time (`todayInTimezone`, above); everything downstream (`packages/stats/src/stats.ts`) just does day-diff math on the resulting date strings, agnostic to timezone entirely.
- Note: same situation as the heatmap above — `packages/stats/src/stats.ts` (`computeGameStats`, streak math, win rate, average guesses) and `StatsSummary.tsx` already existed against fixture data; wiring `getStatsView` to real rows closes this out too.

---

## 11. Backlog — Milestone 5 (v2): Groups

**Issue: Design group data model & invite flow** ✅ done
- Labels: `area:backend`, `milestone:v2`
- Description: `Group`/`GroupMember`/`GroupGame` were already stubbed from Milestone 1 (many-to-many users↔groups and group↔games via composite-key join tables) — this issue adds what was missing: a nullable `Group.passwordHash` (invite-code-only join stays supported; a password is opt-in and owner-resettable) and a new `Reaction` model for the emoji-reactions issue below.
- Acceptance criteria:
  - [x] Schema supports many-to-many users↔groups and group↔games — unchanged from Milestone 1's stub
  - [x] Invite flow decided and documented — shareable link/code (`Group.inviteCode`, already a unique cuid), same pattern as the personal follow-link feature (`User.followCode` → `/follow/[code]`) another dev built this session: here it's `/groups/join/[code]`. No email invites — didn't come up in the actual spec, and a link is simpler for a friend group.
- **Requires a migration**: adds `Group.passwordHash` and the whole `Reaction` model. Run `npm run db:migrate` after pulling.
- Password design: hashed with Node's built-in `crypto.scryptSync` (`apps/web/src/lib/password.ts`) rather than adding a dependency (bcrypt/argon2) — reasonable for a low-stakes group password, not an account credential. Stored as one `"<saltHex>:<hashHex>"` string column. Verification uses `timingSafeEqual`.

**Issue: Create/join group UI** ✅ done
- Labels: `area:frontend`, `milestone:v2`
- Description: Pages to create a group, invite others, and join via invite link/code — plus, beyond the original scope, an optional join password (set at creation or later) and role management.
- Acceptance criteria:
  - [x] User can create a group and get an invite link — `/groups` (create form; creator becomes `role: "owner"`), `ShareGroupLink` component shows the `/groups/join/[code]` link with a copy button
  - [x] Another user can join via that link — `/groups/join/[code]`, or pasting a bare code into the "Join a group" form on `/groups`. If the group has a password (owner can set/change/clear one any time from the group page), joining checks it; wrong password or a dead code both surface a clear inline error (`JoinGroupForm.tsx`) rather than a generic failure.
- Also built, since "admin privilege level or higher" (see the games-assignment issue below) only means something if more than one person can hold it: the owner can promote a member to admin or demote them back (can't touch the owner role itself), and any non-owner member can leave. The owner leaving isn't supported yet — no ownership-transfer flow — noted as a fast-follow rather than blocking this issue.

**Issue: Assign games to a group** ✅ done
- Labels: `area:backend`, `area:frontend`, `milestone:v2`
- Description: Group owner/admin picks games for the group; auto-adds those games to each member's tracked list (per the product description) — this is the propagation the `GroupGame` schema comment has called for since Milestone 1.
- Acceptance criteria:
  - [x] Assigning a game to a group updates all members' tracked games — `assignGameToGroup` upserts a `UserGame` row for every *current* member the moment a game is assigned; joining a group later (`joinGroupByCode`) does the same in reverse, upserting `UserGame` for every game the group already has, so it works both directions regardless of which happens first
  - [x] Removing a game from a group is handled sensibly (doesn't silently delete a member's own history) — `removeGameFromGroup` only deletes the `GroupGame` row; a member's own `UserGame` and all their past `GameResult`s are untouched, same "hide, don't delete" rule as personally untracking a game
- Only `owner`/`admin` members can assign or remove a group's games (`requireRole` check in `apps/web/src/app/groups/actions.ts`); plain members can't.

**Issue: Group dashboard & shared stats** ✅ done
- Labels: `area:frontend`, `milestone:v2`
- Description: View comparing group members' stats for shared games (e.g. a simple leaderboard per game, or a combined heatmap) — a feed plus a per-game leaderboard, not a shared heatmap (a heatmap doesn't have an obvious multi-person representation; a leaderboard does).
- Acceptance criteria:
  - [x] Group page lists members and their stats for group-assigned games — `/groups/[id]`: roster with roles, a feed of results (see the emoji-reactions issue below), and one standings table per assigned game (`buildStandings`, `packages/stats/src/groupStats.ts` — ranked by current streak, then win rate, then games played; reuses `computeGameStats` per member rather than inventing group-specific math)
  - [x] Respects each member's own privacy/timezone settings — the group feed/standings are scoped to `GroupGame` (only games the group actually assigned show up, never a member's whole personal history) and gated entirely behind membership: `getGroupView` doesn't even query results for a non-member, who only ever sees the group's name, member count, and a join form
- Note: standings are all-time (same as the personal `/stats` page), but the feed is a rolling 30-day window (same as the personal follow feed) — a leaderboard should reflect a member's whole history, a feed shouldn't scroll back forever.

**Issue: Group emoji reactions** ✅ done
- Labels: `area:frontend`, `area:backend`, `milestone:v2`
- Description: Not in the original Milestone 5 plan — added by request alongside groups. React to a fellow group member's game result with an emoji.
- Acceptance criteria:
  - [x] Fixed emoji palette (👍 🎉 🔥 😂 😮 💀 — `REACTION_EMOJI` in `packages/types`) rather than free-form input, so a reaction is always one glyph and never an avenue for arbitrary text
  - [x] One click adds your reaction, clicking the same emoji again removes it (`toggleReaction` server action)
  - [x] Reacting is scoped to the group: only possible on a result that actually belongs to a fellow member, for a game the group has assigned — the same visibility rule the feed itself uses
- Comments (on the group, on a game, or on another member) were requested for later, not now — "I would also like to add the option in the future" — intentionally not built. Worth its own issue whenever that's picked up; the `Reaction` model's shape (linked to a `GameResult`, not a `Group`) would need a sibling `Comment` model rather than reusing this one.

## 12. Backlog — Milestone 6: Polish & Mobile-readiness

**Issue: Responsive/mobile-web pass**
- Labels: `area:frontend`, `milestone:v1`
- Description: Make sure the paste box, dashboard, and heatmap all work well on a phone browser — this is your bridge until the native app exists.

**Issue: Daily reminder notifications (stretch)**
- Labels: `area:backend`, `milestone:v2`
- Description: Optional email or push reminder if a user hasn't played their assigned games yet today.

**Issue: Settings page (timezone, notification preferences)**
- Labels: `area:frontend`, `milestone:v1`

**Issue: Clean up API for mobile reuse**
- Labels: `area:backend`, `milestone:v2`
- Description: Make sure backend endpoints used by the web app are versioned/stable and don't assume a browser session (e.g. token-based auth works for a future mobile client too).

## 13. Backlog — Milestone 7 (later): Native Mobile App

**Issue: Scaffold React Native (Expo) app reusing shared packages**
- Labels: `area:mobile`, `milestone:v3`
- Description: New `apps/mobile` package that imports `packages/types` and hits the same API as the web app.

**Issue: Port paste-box flow to mobile**
- Labels: `area:mobile`, `milestone:v3`

**Issue: Port calendar heatmap to mobile**
- Labels: `area:mobile`, `milestone:v3`

**Issue: App store prep (icons, screenshots, listings)**
- Labels: `area:mobile`, `milestone:v3`

---

## 14. How to Use This Doc

1. Create the GitHub Project board and labels first (Section 4 / Milestone 0's board issue).
2. Copy each "Issue:" block above into a new GitHub Issue — the bold line becomes the title, everything under it becomes the issue body.
3. Tackle Milestones 0 and 1 together as a team (setup + schema are the foundation everything else depends on), then split Milestones 2–4 across the 3 of you per Section 4's suggested ownership.
4. Don't create the Milestone 5+ issues in GitHub until v1 (Milestones 0–4) is actually working end to end — keeps the board from feeling overwhelming.
