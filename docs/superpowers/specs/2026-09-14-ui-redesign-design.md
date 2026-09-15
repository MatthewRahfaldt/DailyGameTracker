# UI Redesign — Design

_Date: 2026-09-14 · Branch: `feature/ui-redesign` (stacked on `feature/Add_Groups`)_

## 1. Goals

1. **Complete UI redesign** — one consistent visual system across every page.
2. **Game-specific cards** — results, feed, stats and group standings show each game's real
   metric (Wordle guesses, Connections mistakes, GeoSports score…) instead of the same generic
   "Won in N / win rate / avg guesses" for every game.
3. **Flat navigation** — everything is on the home page or one click away. No "← Back" links.

Non-goals: fixing the known saved-timezone vs UTC-day mismatch (docs/BACKLOG.md), feed
pagination, light mode, new games, database/schema changes, changing any server action's
behavior.

## 2. Visual system — "Dark scoreboard, decluttered"

- **Dark only.** `color-scheme: dark`. Background `stone-950` (#0c0a09), card surface `#161412`,
  hairlines `stone-900`, text `stone-200`, muted `stone-500/600`.
- **Accents:** yellow `#facc15` (brand, active tab, "you" highlight, primary actions); green
  `#4ade80` for a card's number; red `#f87171` for a loss.
- **Type:** system sans for body; monospace (`ui-monospace, Consolas`) for numbers, the logo,
  tabs and small uppercase section labels.
- **Declutter rules (apply everywhere):**
  - One job per page.
  - No boxes around boxes — spacing and single hairlines separate things. Cards are plain
    surfaces without borders; a not-yet-played card is a dashed outline.
  - One big number per card, plus the emoji grid. No badges, sub-lines or puzzle numbers on cards.
  - Uppercase labels only for section titles.
  - Secondary things live behind a tap: full stats, reaction picker, group management,
    following list.

## 3. Navigation

- Shared **app shell** in `layout.tsx`: logo (links home), tabs **Today · Feed · Stats · Groups**,
  avatar menu (**My games** → `/games`, **Profile** → `/profile`, **Sign out**).
- Tabs sit under the header on desktop and become a fixed bottom bar under `sm`.
- Active tab follows the pathname (`/groups/*` → Groups, `/u/*` → Stats).
- All "← Back" links are removed.
- Signed out: header shows a **Sign in** link instead of the avatar; tabs still render.

## 4. Pages

| Route | Content |
|---|---|
| `/` (Today) | Paste box; section label `SEP 14 · 3 / 6`; grid of today's cards for tracked games (unplayed = dashed card with "Play ↗"). Signed out: sign-in options (GitHub, Google, email link) + paste preview. No tracked games: one line linking to My games. |
| `/feed` | Day sections (`TODAY`, `YESTERDAY`, then dates) of result cards with the player's name. `ALL GAMES ▾` menu of links setting `?game=<slug>`. Reaction counts are not shown here (reactions belong to groups). Footer link `Following (n)` expands the list + share link. Following nobody: explanation + share link. |
| `/stats` | Heatmap (tap a day → that day's cards below it); one line per tracked game: `Wordle · 3.9 avg · 12🔥`. Tapping a line expands the game's full stats card. Signed out: generated demo data with a one-line notice. |
| `/u/[id]` | Same view as `/stats` for someone you follow, with their name as the heading and an **Unfollow** action (moved here from the feed). Same access rule as today (`canViewProfile`, 404 otherwise). |
| `/groups` | List of groups (`Office · 5 members ›`); `+ CREATE OR JOIN` expands the create and join forms. |
| `/groups/[id]` | Group name; game menu (`WORDLE ▾`, `?game=<slug>`, defaults to first assigned game); `⋯` menu expands invite link, members & roles, assign/remove games, password, leave/delete (existing forms, same permission rules). Body: standings for the selected game ranked by that game's metric (you highlighted), then the group feed for that game as cards with reaction counts and a `+` picker. Non-members: name, member count, join form (unchanged behavior). |
| `/games`, `/profile` | Same function, restyled; reached from the avatar menu. |
| `/follow/[code]`, `/groups/join/[code]` | Same function, restyled. |

## 5. Game-specific logic

### 5.1 Where it lives

`packages/stats/src/games/` — one module per game, pure functions, unit tested:

```
games/
  types.ts         GameModule, ResultSummary, GameStatsView
  wordle.ts
  connections.ts
  catfishing.ts
  landmarkr.ts
  geoScore.ts      shared by geosports + geohistory
  generic.ts       fallback for unknown parser keys / malformed data
  index.ts         getGameModule(parserKey) registry
```

```ts
type Outcome = "win" | "loss" | "score";

interface ResultSummary {
  gameId: string;
  label: string;          // "WORDLE"
  value: string;          // "3", "845", "✗", "1"
  suffix?: string;        // "/6", "/1,000", " mistake"
  outcome: Outcome;       // win/score → green, loss → red
  grid: string[];         // emoji rows, [] when unavailable
}

interface GameStatsView {
  gameId: string;
  played: number;
  currentStreak: number;
  bestStreak: number;
  line: string;                          // "3.9 avg"
  details: Array<{ label: string; value: string }>;
  distribution?: Array<{ label: string; count: number; loss?: boolean }>;
  rankValue: number | null;              // metric used for standings
}

interface GameModule {
  parserKey: string;
  summarize(result: GameResult, game: Game): ResultSummary;
  stats(results: readonly GameResult[], gameId: string, today: DateString): GameStatsView;
  rankDirection: "asc" | "desc";         // asc = lower is better
}
```

`played`/streaks reuse `computeGameStats`, so all games share one definition of streaks.

### 5.2 Per-game definitions

| Game | Card value | Outcome | Stats line | Details | Distribution | Rank |
|---|---|---|---|---|---|---|
| Wordle | `3` + `/6`; lost `X` + `/6` | win / loss | `3.9 avg` | Played, Win %, Avg guesses (wins), Best streak | 1–6, X | avg guesses, lower better |
| Connections | won: mistakes + ` mistake(s)`; lost: `✗` | win / loss | `1.3 mistakes` | Played, Solved %, Avg mistakes, Perfect, Best streak | 0,1,2,3 mistakes, ✗ | avg mistakes, lower better |
| Catfishing | `7` + `/10` | score (perfect = win) | `6.8/10` | Played, Avg correct, Best, Perfect, Best streak | — | avg correct, higher better |
| Landmarkr | found: guesses + ` guesses`; not found: `✗` | win / loss | `3.1 guesses` | Played, Found %, Avg guesses (found), Best streak | — | avg guesses, lower better |
| GeoSports / GeoHistory | `845` + `/1,000` | score (max = win) | `812 avg` | Played, Avg score, Best, Avg correct, Best streak | — | avg score, higher better |
| Generic | `✓` / `✗` / `Played` | win / loss / score | `N played` | Played, Best streak | — | current streak, higher better |

Averages are formatted to one decimal (scores to whole numbers with thousands separators).

### 5.3 Group standings

`buildStandings` ranks by the game module's `rankValue` and `rankDirection`. Members with a null
`rankValue` sort after everyone with one. Ties break by current streak (desc), then played (desc).
Members with zero results for the game are still excluded. `MemberStanding` gains `view:
GameStatsView`. This changes the groups branch's existing ranking (streak-first) and its tests.

## 6. Data flow & privacy

- Summaries are computed **on the server**. Client components receive only `ResultSummary` /
  `GameStatsView`, never `rawText` or full `parsedData`.
- `FeedItem` gains `summary: ResultSummary`; the feed and group feed queries select
  `parsedData` for this and never forward it.
- Heatmap: the server maps `HeatmapDay[]` to a client shape
  `{ date, played, assigned, ratio, cards: ResultSummary[] }`. This replaces the rawText/parsedData
  redaction workaround in `app/u/[id]/page.tsx`.
- Menus (game picker, `⋯`, create/join, following, stats expand) use links with query params or
  `<details>` — no new client JS. Client components are limited to: tab bar (pathname), avatar
  menu (closes on navigation), heatmap (day selection), paste box (existing).

## 7. Error handling

- **Malformed or missing `parsedData`** (older rows, a parser whose data shape changed): each
  module type-guards its data; on failure it falls back to the generic summary built from
  `won`/`guesses`. Stats skip results whose data is unusable for a metric instead of treating them
  as zero.
- **Unknown `parserKey`:** generic module.
- **Unknown `?game=` slug:** feed ignores it (shows all); group page falls back to the first
  assigned game. A group with no assigned games shows an empty state and the `⋯` menu.
- Existing auth redirects, 404s and server-action error messages are unchanged.

## 8. Testing

- `packages/stats`: `node:test` suites per game module — summary for win/loss/score, malformed data
  falls back to generic, stats values and distribution, rank direction; updated `buildStandings`
  tests covering metric ranking, null metrics and tie-breaks. Existing stats/feed/heatmap tests keep
  passing.
- `apps/web`: `npm run lint` and `next build` (type-check) pass.
- Manual: run the app and check every page at desktop (1280px) and phone (390px) widths, signed in
  and signed out, including empty states.

## 9. Delivery

- Branch `feature/ui-redesign`, based on `origin/feature/Add_Groups`. The PR targets `main` and
  merges after the groups PR.
- Before writing page code, read the relevant Next.js 16 guides in `node_modules/next/dist/docs/`
  (per `apps/web/AGENTS.md`).
