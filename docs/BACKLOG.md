# Daily Game Tracker — Project Plan & GitHub Backlog

_Last updated: 2026-08-29_

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

**Issue: Initialize monorepo and base Next.js + TypeScript project**
- Labels: `area:setup`, `milestone:v1`
- Description: Scaffold the repo structure from Section 3, set up Next.js + TypeScript + Tailwind, commit a working "hello world" page.
- Acceptance criteria:
  - [ ] Repo created, structure matches Section 3
  - [ ] `npm run dev` runs a working blank homepage
  - [ ] README with setup instructions

**Issue: Choose and add an open-source LICENSE file**
- Labels: `area:setup`
- Description: Repo is going public, so it needs a license before anyone else can safely use or contribute to it (no license = "all rights reserved" by default, even if the code is visible). Recommendation: **MIT** — short, permissive, the most common choice for hobby/small-team projects, and well understood by anyone who'd want to use or contribute to it. Add the `LICENSE` file at the repo root (GitHub/GitLab both offer to generate MIT boilerplate with your name + year filled in), and a one-line mention in the README.
- Alternatives to consider instead, if any of these matter to your team:
  - `Apache 2.0` — same permissiveness as MIT, plus an explicit patent grant. Slightly more legal text, worth it if patents are a concern (unlikely for this project).
  - `GPL-3.0` / `AGPL-3.0` — "copyleft": anyone who modifies your code and distributes it (AGPL: or runs it as a hosted service) must also open-source their version. Use this only if you specifically want to prevent someone from taking the project closed-source/commercial without contributing back.
- Not legal advice — if you want certainty for a specific situation (e.g. someone else's game-output format, or a future commercial version), that's worth a real lawyer's opinion, but for a public hobby repo like this, MIT is the standard default.
- Acceptance criteria:
  - [ ] `LICENSE` file added at repo root with the chosen license text
  - [ ] README links to or mentions the license
  - [ ] All 3 contributors agree on the choice before other code is merged (harder to change cleanly later)

**Issue: Set up linting, formatting, and pre-commit checks**
- Labels: `area:setup`
- Description: ESLint + Prettier configured; optional pre-commit hook (husky) so formatting stays consistent across 3 people.
- Acceptance criteria:
  - [ ] `npm run lint` works
  - [ ] Formatting is automatic or enforced on commit

**Issue: Set up CI (build + lint + test on PR)**
- Labels: `area:setup`
- Description: GitHub Actions workflow that runs lint/build/tests on every PR so broken code can't merge unnoticed.
- Acceptance criteria:
  - [ ] PRs show a passing/failing check
  - [ ] Failing build blocks merge (branch protection rule)

**Issue: Provision hosting and database**
- Labels: `area:setup`
- Description: Create Vercel project (connected to repo) and managed Postgres instance (Supabase/Neon). Store connection secrets properly (Vercel env vars, `.env.local` template in repo).
- Acceptance criteria:
  - [ ] `main` auto-deploys to a live URL on push
  - [ ] App can connect to the database from both local dev and the deployed environment

**Issue: Create GitHub Project board and issue labels**
- Labels: `area:setup`
- Description: Set up the board/columns and labels described in Section 4, and paste in the initial backlog from this doc.
- Acceptance criteria:
  - [ ] Board exists with the 4 columns
  - [ ] Labels created
  - [ ] Milestone 0–4 issues added to the board

## 7. Backlog — Milestone 1: Data Model & Auth

**Issue: Design initial database schema**
- Labels: `area:backend`, `milestone:v1`
- Description: Define Prisma schema for `User`, `Game`, `GameResult`, `UserGame` (assignment), and stub out `Group`/`GroupGame` tables even though groups are v2, so the v1 schema doesn't need a breaking migration later.
- Acceptance criteria:
  - [ ] Schema reviewed by all 3 people (this is the one thing worth a live discussion, not just a PR)
  - [ ] Migration runs cleanly against the dev database
  - [ ] Basic seed script with a couple of sample games

**Issue: Choose & set up auth provider** ✅ done
- Labels: `area:backend`, `milestone:v1`
- Description: Wire up Auth.js or Clerk (pick one from Section 2) for email/password or OAuth (e.g. Google) sign-in.
- Acceptance criteria:
  - [x] User can sign up, log in, log out
  - [x] Signed-in user has a session usable in both pages and API routes
- Note: implemented with Auth.js v5, GitHub as the first provider, JWT sessions synced to our own `User` table via callbacks (no Prisma adapter/extra tables needed).

**Issue: Add Google OAuth as a second sign-in option**
- Labels: `area:backend`, `milestone:v1`
- Description: Add Google as a second provider alongside GitHub (`src/auth.ts`) so people without a GitHub account can still sign in. Auth.js v5 reads `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` automatically, same convention as the GitHub provider — no other config changes needed. Requires creating an OAuth client in Google Cloud Console (APIs & Services → Credentials → Create OAuth client ID → Web application), with authorized redirect URI `http://localhost:3000/api/auth/callback/google` for local dev (plus your deployed URL's equivalent once hosted).
- Acceptance criteria:
  - [ ] "Sign in with Google" button works end-to-end, landing on the same session/user record as GitHub sign-in would for the same email
  - [ ] `.env.example` documents `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`

**Issue: Build basic user profile**
- Labels: `area:frontend`, `milestone:v1`
- Description: Minimal profile page (display name, timezone setting — needed later for "which day" a result counts toward).
- Acceptance criteria:
  - [ ] User can view/edit display name and timezone
  - [ ] Timezone is stored and used for date calculations elsewhere in the app

## 8. Backlog — Milestone 2: Parsing Engine

**Issue: Define pluggable parser interface**
- Labels: `area:parsing`, `milestone:v1`
- Description: In `packages/parsers`, define a common interface (e.g. `detect(text): boolean` + `parse(text): ParsedResult`) so each game's parsing logic is self-contained and new games can be added without touching shared code.
- Acceptance criteria:
  - [ ] Interface + a game registry (list of available parsers) exists
  - [ ] Unit test harness set up for parsers (pure functions, easy to test with sample text fixtures)

**Issue: Implement Wordle-style parser (reference implementation)**
- Labels: `area:parsing`, `milestone:v1`
- Description: Parse standard Wordle share text (puzzle number, guesses out of 6, emoji grid) into a score + raw grid. Use this as the template for adding more games.
- Acceptance criteria:
  - [ ] Correctly parses guess count, win/loss, and date/puzzle number
  - [ ] Covers edge cases: failed attempt (X/6), hard mode indicator
  - [ ] Unit tests with real sample outputs

**Issue: Implement parsers for the rest of your target games**
- Labels: `area:parsing`, `milestone:v1`
- Description: Add one issue per additional game you actually want to support at launch (Connections, Nerdle, Framed, or whatever "catfishing" refers to in your group's game list — clarify the exact game name/format before starting this one). Each game gets its own small issue using the interface from above.
- Acceptance criteria:
  - [ ] Each supported game has a parser + tests
  - [ ] Unsupported/garbled paste shows a clear "couldn't parse this" error instead of failing silently

**Issue: Build the paste-box UI on the homepage**
- Labels: `area:frontend`, `milestone:v1`
- Description: Large textarea on the main page. On paste/submit, run text through the parser registry (auto-detect game, or let user confirm which game if ambiguous), show the parsed result for confirmation, then save.
- Acceptance criteria:
  - [ ] Paste → parsed preview → confirm → saved, in one smooth flow
  - [ ] Clear error state for unrecognized text
  - [ ] Duplicate-paste protection (don't double-count the same day's result if pasted twice)

## 9. Backlog — Milestone 3: Self Game Assignment

**Issue: Build "assign games to yourself" UI**
- Labels: `area:frontend`, `milestone:v1`
- Description: A page listing available games where a user can toggle which ones they're tracking.
- Acceptance criteria:
  - [ ] User can add/remove games from their tracked list
  - [ ] Change reflects immediately in their daily dashboard

**Issue: Build daily dashboard view**
- Labels: `area:frontend`, `milestone:v1`
- Description: "Today" view showing each assigned game and whether it's been played yet today (using the user's timezone).
- Acceptance criteria:
  - [ ] Shows correct played/not-played state per assigned game for "today"
  - [ ] Updates immediately after a successful paste/parse

## 10. Backlog — Milestone 4: Calendar Heatmap & Stats

**Issue: Build calendar heatmap component**
- Labels: `area:frontend`, `milestone:v1`
- Description: GitHub-contributions-style heatmap where each day's intensity reflects fraction of assigned games played that day.
- Acceptance criteria:
  - [ ] Renders a full year (or scrollable month view) correctly
  - [ ] Color intensity scales with completion ratio
  - [ ] Clicking a day shows which games were played and their scores

**Issue: Per-game stats (streaks, averages)**
- Labels: `area:backend`, `area:frontend`, `milestone:v1`
- Description: For each tracked game, compute current streak, best streak, average guesses/score, win rate.
- Acceptance criteria:
  - [ ] Stats page per game shows the above
  - [ ] Streak logic correctly handles the user's timezone and missed days

---

## 11. Backlog — Milestone 5 (v2): Groups

**Issue: Design group data model & invite flow**
- Labels: `area:backend`, `milestone:v2`
- Description: `Group`, `GroupMember`, `GroupGame` tables (may already be stubbed from Milestone 1). Decide invite mechanism (shareable code/link vs. email invite).
- Acceptance criteria:
  - [ ] Schema supports many-to-many users↔groups and group↔games
  - [ ] Invite flow decided and documented

**Issue: Create/join group UI**
- Labels: `area:frontend`, `milestone:v2`
- Description: Pages to create a group, invite others, and join via invite link/code.
- Acceptance criteria:
  - [ ] User can create a group and get an invite link
  - [ ] Another user can join via that link

**Issue: Assign games to a group**
- Labels: `area:backend`, `area:frontend`, `milestone:v2`
- Description: Group owner/admin picks games for the group; decide and implement the rule that this auto-adds those games to each member's tracked list (per the product description).
- Acceptance criteria:
  - [ ] Assigning a game to a group updates all members' tracked games
  - [ ] Removing a game from a group is handled sensibly (doesn't silently delete a member's own history)

**Issue: Group dashboard & shared stats**
- Labels: `area:frontend`, `milestone:v2`
- Description: View comparing group members' stats for shared games (e.g. a simple leaderboard per game, or a combined heatmap).
- Acceptance criteria:
  - [ ] Group page lists members and their stats for group-assigned games
  - [ ] Respects each member's own privacy/timezone settings

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
