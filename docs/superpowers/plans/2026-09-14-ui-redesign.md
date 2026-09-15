# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the web app as a decluttered dark "scoreboard" UI with flat tab navigation and game-specific result cards, stats and group standings.

**Architecture:** Per-game pure modules in `packages/stats/src/games/` turn a `GameResult` into a display `ResultSummary` and a person's results into a `GameStatsView` (plus a ranking metric). The web app computes these on the server and passes only those display shapes to components. A shared app shell (header, tabs, avatar menu) replaces all "← Back" links.

**Tech Stack:** Next.js 16 (App Router, React 18), Tailwind CSS 3.4, Prisma 5, TypeScript, `node:test` via `tsx` for `packages/stats`.

**Spec:** `docs/superpowers/specs/2026-09-14-ui-redesign-design.md`

## Global Constraints

- Dark only: `color-scheme: dark`; background `stone-950`, card surface `#161412` (`bg-surface`), accent `yellow-400`, card value `green-400`, loss `red-400`.
- Monospace (`font-mono`) only for numbers, logo, tabs and small uppercase section labels.
- No database schema changes, no migrations, no new npm dependencies.
- Server actions keep their current behavior (only their call sites/markup change).
- Client components receive only `ResultSummary` / `GameStatsView` / plain display data — never `rawText` or `parsedData`.
- No "← Back" links anywhere.
- Next 16 conventions: page `params` and `searchParams` are `Promise`s and must be awaited.
- `packages/stats` must not import `@dgt/parsers`; parsed data is read through type guards.
- Web app has no test runner: web tasks verify with `npx tsc --noEmit -p apps/web/tsconfig.json` and `npm run lint -w apps/web` (both pass on the branch baseline).
- Every commit message ends with:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01B4GK9vTLHyFvTnnzVFHR6x
  ```

## Notes that refine the spec

- `ResultSummary` also carries `resultId` (React keys, reactions).
- One data-driven `ResultCard` renders every game's `ResultSummary`; there are no per-game card components.
- The group page's feed shows only the selected game's results.
- `buildStandings` takes a `Game` (it needs `parserKey`) and returns `{ actor, view }`.

## File map

`packages/stats`
- Create `src/games/types.ts` — `Outcome`, `ResultSummary`, `StatDetail`, `DistributionBar`, `GameStatsView`, `GameModule`.
- Create `src/games/data.ts` — `isRecord`, `readNumber`, `readGrid` guards.
- Create `src/games/format.ts` — `mean`, `formatAverage`, `formatPercent`, `formatInteger`, `plural`.
- Create `src/games/generic.ts` — `cardFields`, `baseSummary`, `commonStats`, `dailyResults`, `detail`, `genericModule`.
- Create `src/games/{wordle,connections,catfishing,landmarkr,geoScore}.ts` — one module each.
- Create `src/games/index.ts` — registry: `getGameModule`, `summarizeResult`, `gameStatsView`, type re-exports.
- Modify `src/stats.ts` (export `dedupeByDay`), `src/groupStats.ts`, `src/feed.ts`, `src/heatmap.ts` (generic `toWeeks`), `src/dates.ts` (`formatShortDate`, `dayLabel`), `src/index.ts`, `package.json` test script.
- Tests: `test/games/helpers.ts`, `test/games/*.test.ts`, `test/dayLabel.test.ts`, rewrite `test/groupStats.test.ts`, update `test/feed.test.ts`.

`apps/web`
- Create `src/lib/result-rows.ts` (Prisma row → shared types), `src/lib/today-view.ts`, `src/lib/stats-view.ts`, `src/lib/stats-queries.ts`.
- Create `src/components/ui/{styles.ts,Page.tsx,SectionLabel.tsx,Menu.tsx,ResultCard.tsx,CopyLink.tsx}`.
- Create `src/components/shell/{AppHeader.tsx,NavTabs.tsx}`, `src/components/SignInPanel.tsx`.
- Create `src/components/stats/{ActivityHeatmap.tsx,GameStatsCard.tsx,StatsView.tsx}`, `src/components/groups/{Reactions.tsx,GroupManage.tsx}`.
- Rewrite every page under `src/app/`, `layout.tsx`, `globals.css`, `tailwind.config.ts`, `PasteBox.tsx`, `demo-data.ts`, `feed-queries.ts`, `feed-view.ts`, `group-queries.ts`, `group-view.ts`, and restyle `JoinGroupForm`, `PasswordField`, `DeleteGroupButton`, `GameLink`.
- Delete `AuthStatus`, `TodayDashboard`, `FeedList`, `GroupFeedList`, `StatsSummary`, `CalendarHeatmap`, `ShareFollowLink`, `ShareGroupLink`.

---

### Task 1: Game module foundation

**Files:**
- Create: `packages/stats/src/games/types.ts`, `data.ts`, `format.ts`, `generic.ts`, `index.ts`
- Modify: `packages/stats/src/stats.ts:30` (export `dedupeByDay`), `packages/stats/src/index.ts`, `packages/stats/package.json`
- Test: `packages/stats/test/games/helpers.ts`, `packages/stats/test/games/generic.test.ts`

**Interfaces:**
- Produces: all types in `types.ts` below; `isRecord(value: unknown): value is Record<string, unknown>`, `readNumber(data, key): number | null`, `readGrid(data): string[] | null`; `mean`, `formatAverage`, `formatPercent`, `formatInteger`, `plural`; `cardFields(result, game, grid)`, `baseSummary(result, game): ResultSummary`, `commonStats(results, gameId, today): CommonStats`, `dailyResults(results, gameId): GameResult[]` (deduped, date-ascending), `detail(label, value): StatDetail`, `genericModule`; registry `getGameModule(parserKey): GameModule`, `summarizeResult(result, game): ResultSummary`, `gameStatsView(results, game, today?): GameStatsView`.

- [ ] **Step 1: Write the test helper**

`packages/stats/test/games/helpers.ts`:
```ts
import type { Game, GameResult } from "@dgt/types";
import type { GameStatsView } from "../../src/games/types";

export const TODAY = "2026-09-14";

export function game(parserKey: string, name = parserKey): Game {
  return { id: `game-${parserKey}`, slug: parserKey, name, parserKey, url: null };
}

export function result(
  parserKey: string,
  partial: Partial<GameResult> & { playedDate: string },
): GameResult {
  return {
    id: `r-${parserKey}-${partial.playedDate}`,
    userId: "user-1",
    gameId: `game-${parserKey}`,
    guesses: null,
    won: null,
    rawText: "",
    parsedData: null,
    ...partial,
  };
}

export function detailValue(view: GameStatsView, label: string): string | undefined {
  return view.details.find((entry) => entry.label === label)?.value;
}
```

- [ ] **Step 2: Write the failing tests**

`packages/stats/test/games/generic.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule, summarizeResult } from "../../src/games";
import { dailyResults, genericModule } from "../../src/games/generic";
import { TODAY, detailValue, game, result } from "./helpers";

const nerdle = game("nerdle", "Nerdle");

test("generic summary shows a check for a win, a cross for a loss, Played otherwise", () => {
  const win = genericModule.summarize(result("nerdle", { playedDate: TODAY, won: true }), nerdle);
  assert.deepEqual(win, {
    resultId: `r-nerdle-${TODAY}`,
    gameId: "game-nerdle",
    label: "NERDLE",
    value: "✓",
    outcome: "win",
    grid: [],
  });
  assert.equal(genericModule.summarize(result("nerdle", { playedDate: TODAY, won: false }), nerdle).outcome, "loss");
  const played = genericModule.summarize(result("nerdle", { playedDate: TODAY }), nerdle);
  assert.equal(played.value, "Played");
  assert.equal(played.outcome, "score");
});

test("generic stats report played, streaks and rank by current streak", () => {
  const results = [
    result("nerdle", { playedDate: "2026-09-13", won: true }),
    result("nerdle", { playedDate: "2026-09-14", won: true }),
  ];
  const view = genericModule.stats(results, "game-nerdle", TODAY);
  assert.equal(view.played, 2);
  assert.equal(view.currentStreak, 2);
  assert.equal(view.line, "2 played");
  assert.equal(detailValue(view, "Best streak"), "2");
  assert.equal(view.rankValue, 2);
});

test("generic stats with no results have no rank value", () => {
  assert.equal(genericModule.stats([], "game-nerdle", TODAY).rankValue, null);
});

test("unknown parser keys fall back to the generic module", () => {
  assert.equal(getGameModule("does-not-exist"), genericModule);
  assert.equal(summarizeResult(result("nerdle", { playedDate: TODAY, won: true }), nerdle).value, "✓");
});

test("dailyResults dedupes by day and sorts oldest first", () => {
  const rows = dailyResults(
    [
      result("nerdle", { playedDate: "2026-09-14", won: true }),
      result("nerdle", { playedDate: "2026-09-12", won: true }),
      { ...result("nerdle", { playedDate: "2026-09-14", won: false }), id: "dupe" },
      result("other", { playedDate: "2026-09-13", won: true }),
    ],
    "game-nerdle",
  );
  assert.deepEqual(rows.map((row) => row.id), [`r-nerdle-2026-09-12`, "dupe"]);
});
```

- [ ] **Step 3: Register the test file and run it to see it fail**

In `packages/stats/package.json` set the `test` script to:
```
tsx --test test/dates.test.ts test/heatmap.test.ts test/stats.test.ts test/weeks.test.ts test/feed.test.ts test/groupStats.test.ts test/games/generic.test.ts
```
Run: `npm test -w packages/stats`
Expected: FAIL — cannot find module `../../src/games`.

- [ ] **Step 4: Export `dedupeByDay` from stats.ts**

In `packages/stats/src/stats.ts` change `function dedupeByDay(` to `export function dedupeByDay(`.

- [ ] **Step 5: Write types, guards and formatters**

`packages/stats/src/games/types.ts`:
```ts
import type { Game, GameResult } from "@dgt/types";
import type { DateString } from "../dates";

/** win/score render in the "good" color, loss in the "bad" color. */
export type Outcome = "win" | "loss" | "score";

/** Everything a result card shows. Safe to send to the browser: no rawText, no parsedData. */
export interface ResultSummary {
  resultId: string;
  gameId: string;
  /** Upper-cased game name, e.g. "WORDLE". */
  label: string;
  /** The one big number, e.g. "3", "845", "✗". */
  value: string;
  /** Smaller text after the value, e.g. "/6", "/1,000", " mistakes". */
  suffix?: string;
  outcome: Outcome;
  /** Emoji share-grid rows; empty when the game's data is unavailable. */
  grid: string[];
}

export interface StatDetail {
  label: string;
  value: string;
}

export interface DistributionBar {
  label: string;
  count: number;
  loss?: boolean;
}

/** One person's stats for one game, already formatted for display. */
export interface GameStatsView {
  gameId: string;
  played: number;
  currentStreak: number;
  bestStreak: number;
  /** Short headline, e.g. "3.9 avg". */
  line: string;
  details: StatDetail[];
  distribution?: DistributionBar[];
  /** The metric group standings sort by; null when there's nothing to rank. */
  rankValue: number | null;
}

export interface GameModule {
  /** Matches Game.parserKey. */
  parserKey: string;
  /** "asc" = lower rankValue is better. */
  rankDirection: "asc" | "desc";
  summarize(result: GameResult, game: Game): ResultSummary;
  stats(results: readonly GameResult[], gameId: string, today: DateString): GameStatsView;
}
```

`packages/stats/src/games/data.ts`:
```ts
/**
 * Type guards for GameResult.parsedData. It is JSON written by whichever parser version saved the
 * row, so every read is defensive: a missing or wrongly-typed field yields null, and the calling
 * module falls back to the generic summary instead of rendering garbage.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readNumber(data: Record<string, unknown>, key: string): number | null {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readGrid(data: Record<string, unknown>): string[] | null {
  const grid = data.grid;
  if (!Array.isArray(grid) || !grid.every((row) => typeof row === "string")) return null;
  return grid as string[];
}
```

`packages/stats/src/games/format.ts`:
```ts
export function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatAverage(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export function formatInteger(value: number | null): string {
  return value === null ? "—" : Math.round(value).toLocaleString("en-US");
}

export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}
```

- [ ] **Step 6: Write the generic module and registry**

`packages/stats/src/games/generic.ts`:
```ts
import type { Game, GameResult } from "@dgt/types";
import type { DateString } from "../dates";
import { computeGameStats, dedupeByDay } from "../stats";
import type { GameModule, ResultSummary, StatDetail } from "./types";

export function cardFields(result: GameResult, game: Game, grid: string[]) {
  return { resultId: result.id, gameId: game.id, label: game.name.toUpperCase(), grid };
}

/** Fallback card from the `won` column alone — used for unknown games and unreadable data. */
export function baseSummary(result: GameResult, game: Game): ResultSummary {
  const fields = cardFields(result, game, []);
  if (result.won === true) return { ...fields, value: "✓", outcome: "win" };
  if (result.won === false) return { ...fields, value: "✗", outcome: "loss" };
  return { ...fields, value: "Played", outcome: "score" };
}

export interface CommonStats {
  played: number;
  currentStreak: number;
  bestStreak: number;
}

/** Played count and streaks come from computeGameStats so every game shares one definition. */
export function commonStats(
  results: readonly GameResult[],
  gameId: string,
  today: DateString,
): CommonStats {
  const stats = computeGameStats(results, gameId, today);
  return { played: stats.played, currentStreak: stats.currentStreak, bestStreak: stats.bestStreak };
}

/** One result per day for this game (last write wins), oldest first. */
export function dailyResults(results: readonly GameResult[], gameId: string): GameResult[] {
  return [...dedupeByDay(results, gameId).entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, result]) => result);
}

export function detail(label: string, value: string | number): StatDetail {
  return { label, value: String(value) };
}

export const genericModule: GameModule = {
  parserKey: "generic",
  rankDirection: "desc",
  summarize: baseSummary,
  stats(results, gameId, today) {
    const common = commonStats(results, gameId, today);
    return {
      gameId,
      ...common,
      line: `${common.played} played`,
      details: [detail("Played", common.played), detail("Best streak", common.bestStreak)],
      rankValue: common.played === 0 ? null : common.currentStreak,
    };
  },
};
```

`packages/stats/src/games/index.ts`:
```ts
import type { Game, GameResult } from "@dgt/types";
import { type DateString, todayUtc } from "../dates";
import { genericModule } from "./generic";
import type { GameModule, GameStatsView, ResultSummary } from "./types";

export type {
  DistributionBar,
  GameModule,
  GameStatsView,
  Outcome,
  ResultSummary,
  StatDetail,
} from "./types";

const MODULES: readonly GameModule[] = [];

const BY_PARSER_KEY = new Map(MODULES.map((module) => [module.parserKey, module]));

/** The module for a game's parser key, or the generic fallback. */
export function getGameModule(parserKey: string): GameModule {
  return BY_PARSER_KEY.get(parserKey) ?? genericModule;
}

export function summarizeResult(result: GameResult, game: Game): ResultSummary {
  return getGameModule(game.parserKey).summarize(result, game);
}

export function gameStatsView(
  results: readonly GameResult[],
  game: Game,
  today: DateString = todayUtc(),
): GameStatsView {
  return getGameModule(game.parserKey).stats(results, game.id, today);
}
```

In `packages/stats/src/index.ts` add the line `export * from "./games";` at the end.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -w packages/stats`
Expected: PASS, 59 tests (54 existing + 5 new), 0 failures.

- [ ] **Step 8: Commit**

```bash
git add packages/stats
git commit -m "feat(stats): add per-game module registry with generic fallback"
```
(with the attribution trailer from Global Constraints)

---

### Task 2: Wordle module

**Files:**
- Create: `packages/stats/src/games/wordle.ts`
- Modify: `packages/stats/src/games/index.ts`, `packages/stats/package.json`
- Test: `packages/stats/test/games/wordle.test.ts`

**Interfaces:**
- Consumes: Task 1 `cardFields`, `baseSummary`, `commonStats`, `dailyResults`, `detail`, `isRecord`, `readGrid`, `mean`, `formatAverage`, `formatPercent`.
- Produces: `wordleModule: GameModule` (parserKey `"wordle"`, rankDirection `"asc"`, details labels `Played`, `Win %`, `Avg guesses`, `Best streak`; distribution labels `1`–`6`, `X`).

- [ ] **Step 1: Write the failing tests**

`packages/stats/test/games/wordle.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule } from "../../src/games";
import { wordleModule } from "../../src/games/wordle";
import { TODAY, detailValue, game, result } from "./helpers";

const wordle = game("wordle", "Wordle");
const grid = ["⬛🟨⬛⬛⬛", "🟩🟩🟩🟩🟩"];
const data = { puzzleNumber: 1234, hardMode: false, grid };

test("registry returns the Wordle module", () => {
  assert.equal(getGameModule("wordle"), wordleModule);
});

test("a win shows guesses out of 6 with the grid", () => {
  const summary = wordleModule.summarize(
    result("wordle", { playedDate: TODAY, won: true, guesses: 2, parsedData: data }),
    wordle,
  );
  assert.equal(summary.label, "WORDLE");
  assert.equal(summary.value, "2");
  assert.equal(summary.suffix, "/6");
  assert.equal(summary.outcome, "win");
  assert.deepEqual(summary.grid, grid);
});

test("a loss shows X/6", () => {
  const summary = wordleModule.summarize(
    result("wordle", { playedDate: TODAY, won: false, parsedData: data }),
    wordle,
  );
  assert.equal(summary.value, "X");
  assert.equal(summary.suffix, "/6");
  assert.equal(summary.outcome, "loss");
});

test("unreadable parsedData falls back to the generic card", () => {
  const summary = wordleModule.summarize(
    result("wordle", { playedDate: TODAY, won: true, guesses: 3, parsedData: { grid: "nope" } }),
    wordle,
  );
  assert.equal(summary.value, "✓");
  assert.deepEqual(summary.grid, []);
});

test("stats average winning guesses, win rate and distribution", () => {
  const view = wordleModule.stats(
    [
      result("wordle", { playedDate: "2026-09-12", won: true, guesses: 3 }),
      result("wordle", { playedDate: "2026-09-13", won: true, guesses: 5 }),
      result("wordle", { playedDate: "2026-09-14", won: false }),
    ],
    "game-wordle",
    TODAY,
  );
  assert.equal(view.played, 3);
  assert.equal(view.currentStreak, 3);
  assert.equal(view.line, "4.0 avg");
  assert.equal(detailValue(view, "Win %"), "67%");
  assert.equal(detailValue(view, "Avg guesses"), "4.0");
  assert.equal(view.rankValue, 4);
  const counts = Object.fromEntries((view.distribution ?? []).map((bar) => [bar.label, bar.count]));
  assert.deepEqual(counts, { "1": 0, "2": 0, "3": 1, "4": 0, "5": 1, "6": 0, X: 1 });
  assert.equal(view.distribution?.at(-1)?.loss, true);
});

test("stats with no wins have no rank value", () => {
  const view = wordleModule.stats(
    [result("wordle", { playedDate: TODAY, won: false })],
    "game-wordle",
    TODAY,
  );
  assert.equal(view.line, "1 played");
  assert.equal(view.rankValue, null);
});
```

- [ ] **Step 2: Register and run to see it fail**

Append ` test/games/wordle.test.ts` to the end of the `test` script in `packages/stats/package.json`.
Run: `npm test -w packages/stats`
Expected: FAIL — cannot find module `../../src/games/wordle`.

- [ ] **Step 3: Implement**

`packages/stats/src/games/wordle.ts`:
```ts
import type { GameResult } from "@dgt/types";
import { isRecord, readGrid } from "./data";
import { formatAverage, formatPercent, mean } from "./format";
import { baseSummary, cardFields, commonStats, dailyResults, detail } from "./generic";
import type { GameModule } from "./types";

function readWordleGrid(result: GameResult): string[] | null {
  return isRecord(result.parsedData) ? readGrid(result.parsedData) : null;
}

export const wordleModule: GameModule = {
  parserKey: "wordle",
  rankDirection: "asc",

  summarize(result, game) {
    const grid = readWordleGrid(result);
    if (!grid) return baseSummary(result, game);
    if (result.won === true && typeof result.guesses === "number") {
      return { ...cardFields(result, game, grid), value: String(result.guesses), suffix: "/6", outcome: "win" };
    }
    if (result.won === false) {
      return { ...cardFields(result, game, grid), value: "X", suffix: "/6", outcome: "loss" };
    }
    return baseSummary(result, game);
  },

  stats(results, gameId, today) {
    const common = commonStats(results, gameId, today);
    const rows = dailyResults(results, gameId);
    const wins = rows.filter((row) => row.won === true);
    const losses = rows.filter((row) => row.won === false).length;
    const decided = wins.length + losses;
    const winGuesses = wins
      .map((row) => row.guesses)
      .filter((guesses): guesses is number => typeof guesses === "number" && guesses >= 1 && guesses <= 6);
    const average = mean(winGuesses);

    return {
      gameId,
      ...common,
      line: average === null ? `${common.played} played` : `${formatAverage(average)} avg`,
      details: [
        detail("Played", common.played),
        detail("Win %", formatPercent(decided === 0 ? null : wins.length / decided)),
        detail("Avg guesses", formatAverage(average)),
        detail("Best streak", common.bestStreak),
      ],
      distribution: [
        ...[1, 2, 3, 4, 5, 6].map((n) => ({
          label: String(n),
          count: winGuesses.filter((guesses) => guesses === n).length,
        })),
        { label: "X", count: losses, loss: true },
      ],
      rankValue: average,
    };
  },
};
```

In `packages/stats/src/games/index.ts` add `import { wordleModule } from "./wordle";` after the generic import, and change the registry line to:
```ts
const MODULES: readonly GameModule[] = [wordleModule];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w packages/stats`
Expected: PASS, 65 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add packages/stats
git commit -m "feat(stats): add Wordle game module"
```

---

### Task 3: Connections module

**Files:**
- Create: `packages/stats/src/games/connections.ts`
- Modify: `packages/stats/src/games/index.ts`, `packages/stats/package.json`
- Test: `packages/stats/test/games/connections.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers; `plural`, `readNumber`.
- Produces: `connectionsModule: GameModule` (parserKey `"connections"`, `"asc"`; details `Played`, `Solved`, `Avg mistakes`, `Perfect`, `Best streak`; distribution `0`–`3`, `✗`).

- [ ] **Step 1: Write the failing tests**

`packages/stats/test/games/connections.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule } from "../../src/games";
import { connectionsModule } from "../../src/games/connections";
import { TODAY, detailValue, game, result } from "./helpers";

const connections = game("connections", "Connections");
const grid = ["🟨🟨🟨🟨", "🟩🟦🟩🟩", "🟩🟩🟩🟩", "🟦🟦🟦🟦", "🟪🟪🟪🟪"];
const data = (mistakes: number) => ({ puzzleNumber: 512, grid, mistakes, solvedGroups: 4 });

test("registry returns the Connections module", () => {
  assert.equal(getGameModule("connections"), connectionsModule);
});

test("a solve shows the mistake count", () => {
  const one = connectionsModule.summarize(
    result("connections", { playedDate: TODAY, won: true, parsedData: data(1) }),
    connections,
  );
  assert.equal(one.value, "1");
  assert.equal(one.suffix, " mistake");
  assert.equal(one.outcome, "win");
  assert.deepEqual(one.grid, grid);
  const zero = connectionsModule.summarize(
    result("connections", { playedDate: TODAY, won: true, parsedData: data(0) }),
    connections,
  );
  assert.equal(zero.suffix, " mistakes");
});

test("a failed puzzle shows a cross", () => {
  const summary = connectionsModule.summarize(
    result("connections", { playedDate: TODAY, won: false, parsedData: data(4) }),
    connections,
  );
  assert.equal(summary.value, "✗");
  assert.equal(summary.suffix, undefined);
  assert.equal(summary.outcome, "loss");
});

test("missing mistakes falls back to the generic card", () => {
  const summary = connectionsModule.summarize(
    result("connections", { playedDate: TODAY, won: true, parsedData: { grid } }),
    connections,
  );
  assert.equal(summary.value, "✓");
});

test("stats average mistakes over every readable result", () => {
  const view = connectionsModule.stats(
    [
      result("connections", { playedDate: "2026-09-12", won: true, parsedData: data(0) }),
      result("connections", { playedDate: "2026-09-13", won: true, parsedData: data(2) }),
      result("connections", { playedDate: "2026-09-14", won: false, parsedData: data(4) }),
    ],
    "game-connections",
    TODAY,
  );
  assert.equal(view.line, "2.0 mistakes");
  assert.equal(detailValue(view, "Solved"), "67%");
  assert.equal(detailValue(view, "Perfect"), "1");
  assert.equal(view.rankValue, 2);
  const counts = Object.fromEntries((view.distribution ?? []).map((bar) => [bar.label, bar.count]));
  assert.deepEqual(counts, { "0": 1, "1": 0, "2": 1, "3": 0, "✗": 1 });
});
```

- [ ] **Step 2: Register and run to see it fail**

Append ` test/games/connections.test.ts` to the `test` script.
Run: `npm test -w packages/stats`
Expected: FAIL — cannot find module `../../src/games/connections`.

- [ ] **Step 3: Implement**

`packages/stats/src/games/connections.ts`:
```ts
import type { GameResult } from "@dgt/types";
import { isRecord, readGrid, readNumber } from "./data";
import { formatAverage, formatPercent, mean, plural } from "./format";
import { baseSummary, cardFields, commonStats, dailyResults, detail } from "./generic";
import type { GameModule } from "./types";

interface ConnectionsData {
  grid: string[];
  mistakes: number;
}

function readConnections(result: GameResult): ConnectionsData | null {
  if (!isRecord(result.parsedData)) return null;
  const grid = readGrid(result.parsedData);
  const mistakes = readNumber(result.parsedData, "mistakes");
  return grid && mistakes !== null ? { grid, mistakes } : null;
}

export const connectionsModule: GameModule = {
  parserKey: "connections",
  rankDirection: "asc",

  summarize(result, game) {
    const data = readConnections(result);
    if (!data || result.won == null) return baseSummary(result, game);
    const fields = cardFields(result, game, data.grid);
    if (result.won) {
      return {
        ...fields,
        value: String(data.mistakes),
        suffix: plural(data.mistakes, " mistake", " mistakes"),
        outcome: "win",
      };
    }
    return { ...fields, value: "✗", outcome: "loss" };
  },

  stats(results, gameId, today) {
    const common = commonStats(results, gameId, today);
    const rows = dailyResults(results, gameId);
    const solved = rows.filter((row) => row.won === true).length;
    const failed = rows.filter((row) => row.won === false).length;
    const mistakes: number[] = [];
    const solvedMistakes: number[] = [];
    for (const row of rows) {
      const data = readConnections(row);
      if (!data) continue;
      mistakes.push(data.mistakes);
      if (row.won === true) solvedMistakes.push(data.mistakes);
    }
    const average = mean(mistakes);
    const decided = solved + failed;

    return {
      gameId,
      ...common,
      line: average === null ? `${common.played} played` : `${formatAverage(average)} mistakes`,
      details: [
        detail("Played", common.played),
        detail("Solved", formatPercent(decided === 0 ? null : solved / decided)),
        detail("Avg mistakes", formatAverage(average)),
        detail("Perfect", solvedMistakes.filter((count) => count === 0).length),
        detail("Best streak", common.bestStreak),
      ],
      distribution: [
        ...[0, 1, 2, 3].map((n) => ({
          label: String(n),
          count: solvedMistakes.filter((count) => count === n).length,
        })),
        { label: "✗", count: failed, loss: true },
      ],
      rankValue: average,
    };
  },
};
```

In `packages/stats/src/games/index.ts` add `import { connectionsModule } from "./connections";` and set:
```ts
const MODULES: readonly GameModule[] = [wordleModule, connectionsModule];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w packages/stats`
Expected: PASS, 70 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add packages/stats
git commit -m "feat(stats): add Connections game module"
```

---

### Task 4: Catfishing module

**Files:**
- Create: `packages/stats/src/games/catfishing.ts`
- Modify: `packages/stats/src/games/index.ts`, `packages/stats/package.json`
- Test: `packages/stats/test/games/catfishing.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces: `catfishingModule: GameModule` (parserKey `"catfishing"`, `"desc"`; details `Played`, `Avg correct`, `Best`, `Perfect`, `Best streak`; no distribution).

- [ ] **Step 1: Write the failing tests**

`packages/stats/test/games/catfishing.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule } from "../../src/games";
import { catfishingModule } from "../../src/games/catfishing";
import { TODAY, detailValue, game, result } from "./helpers";

const catfishing = game("catfishing", "Catfishing");
const grid = ["🐈🐈🐟🐈🐈", "🐈🐟🐈🐈🐟"];
const data = (correct: number) => ({ puzzleNumber: 797, correct, totalQuestions: 10, grid });

test("registry returns the Catfishing module", () => {
  assert.equal(getGameModule("catfishing"), catfishingModule);
});

test("a result shows correct out of total; a perfect run is a win", () => {
  const seven = catfishingModule.summarize(
    result("catfishing", { playedDate: TODAY, won: false, parsedData: data(7) }),
    catfishing,
  );
  assert.equal(seven.value, "7");
  assert.equal(seven.suffix, "/10");
  assert.equal(seven.outcome, "score");
  assert.deepEqual(seven.grid, grid);
  const ten = catfishingModule.summarize(
    result("catfishing", { playedDate: TODAY, won: true, parsedData: data(10) }),
    catfishing,
  );
  assert.equal(ten.outcome, "win");
});

test("unreadable data falls back to the generic card", () => {
  const summary = catfishingModule.summarize(
    result("catfishing", { playedDate: TODAY, won: true, parsedData: null }),
    catfishing,
  );
  assert.equal(summary.value, "✓");
});

test("stats average correct answers and rank higher first", () => {
  const view = catfishingModule.stats(
    [
      result("catfishing", { playedDate: "2026-09-12", parsedData: data(6) }),
      result("catfishing", { playedDate: "2026-09-13", parsedData: data(8) }),
      result("catfishing", { playedDate: "2026-09-14", parsedData: data(10) }),
    ],
    "game-catfishing",
    TODAY,
  );
  assert.equal(view.line, "8.0/10");
  assert.equal(detailValue(view, "Avg correct"), "8.0/10");
  assert.equal(detailValue(view, "Best"), "10/10");
  assert.equal(detailValue(view, "Perfect"), "1");
  assert.equal(view.rankValue, 8);
  assert.equal(view.distribution, undefined);
  assert.equal(catfishingModule.rankDirection, "desc");
});
```

- [ ] **Step 2: Register and run to see it fail**

Append ` test/games/catfishing.test.ts` to the `test` script.
Run: `npm test -w packages/stats`
Expected: FAIL — cannot find module `../../src/games/catfishing`.

- [ ] **Step 3: Implement**

`packages/stats/src/games/catfishing.ts`:
```ts
import type { GameResult } from "@dgt/types";
import { isRecord, readGrid, readNumber } from "./data";
import { formatAverage, mean } from "./format";
import { baseSummary, cardFields, commonStats, dailyResults, detail } from "./generic";
import type { GameModule } from "./types";

interface CatfishingData {
  grid: string[];
  correct: number;
  total: number;
}

function readCatfishing(result: GameResult): CatfishingData | null {
  if (!isRecord(result.parsedData)) return null;
  const grid = readGrid(result.parsedData);
  const correct = readNumber(result.parsedData, "correct");
  const total = readNumber(result.parsedData, "totalQuestions");
  return grid && correct !== null && total !== null && total > 0 ? { grid, correct, total } : null;
}

export const catfishingModule: GameModule = {
  parserKey: "catfishing",
  rankDirection: "desc",

  summarize(result, game) {
    const data = readCatfishing(result);
    if (!data) return baseSummary(result, game);
    return {
      ...cardFields(result, game, data.grid),
      value: String(data.correct),
      suffix: `/${data.total}`,
      outcome: data.correct === data.total ? "win" : "score",
    };
  },

  stats(results, gameId, today) {
    const common = commonStats(results, gameId, today);
    const scores = dailyResults(results, gameId).flatMap((row) => {
      const data = readCatfishing(row);
      return data ? [data] : [];
    });
    const average = mean(scores.map((score) => score.correct));
    const best = scores.length === 0 ? null : Math.max(...scores.map((score) => score.correct));
    const total = scores.at(-1)?.total ?? 10;

    return {
      gameId,
      ...common,
      line: average === null ? `${common.played} played` : `${formatAverage(average)}/${total}`,
      details: [
        detail("Played", common.played),
        detail("Avg correct", average === null ? "—" : `${formatAverage(average)}/${total}`),
        detail("Best", best === null ? "—" : `${best}/${total}`),
        detail("Perfect", scores.filter((score) => score.correct === score.total).length),
        detail("Best streak", common.bestStreak),
      ],
      rankValue: average,
    };
  },
};
```

In `packages/stats/src/games/index.ts` add `import { catfishingModule } from "./catfishing";` and set:
```ts
const MODULES: readonly GameModule[] = [wordleModule, connectionsModule, catfishingModule];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w packages/stats`
Expected: PASS, 74 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add packages/stats
git commit -m "feat(stats): add Catfishing game module"
```

---

### Task 5: Landmarkr module

**Files:**
- Create: `packages/stats/src/games/landmarkr.ts`
- Modify: `packages/stats/src/games/index.ts`, `packages/stats/package.json`
- Test: `packages/stats/test/games/landmarkr.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces: `landmarkrModule: GameModule` (parserKey `"landmarkr"`, `"asc"`; details `Played`, `Found`, `Avg guesses`, `Best streak`).

- [ ] **Step 1: Write the failing tests**

`packages/stats/test/games/landmarkr.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule } from "../../src/games";
import { landmarkrModule } from "../../src/games/landmarkr";
import { TODAY, detailValue, game, result } from "./helpers";

const landmarkr = game("landmarkr", "Landmarkr");
const data = { puzzleNumber: 334, grid: ["⬛ ⬛ ⬛ ⬛ 🟩"], attempts: 5 };

test("registry returns the Landmarkr module", () => {
  assert.equal(getGameModule("landmarkr"), landmarkrModule);
});

test("a find shows the guess count", () => {
  const five = landmarkrModule.summarize(
    result("landmarkr", { playedDate: TODAY, won: true, guesses: 5, parsedData: data }),
    landmarkr,
  );
  assert.equal(five.value, "5");
  assert.equal(five.suffix, " guesses");
  assert.equal(five.outcome, "win");
  assert.deepEqual(five.grid, data.grid);
  const one = landmarkrModule.summarize(
    result("landmarkr", { playedDate: TODAY, won: true, guesses: 1, parsedData: data }),
    landmarkr,
  );
  assert.equal(one.suffix, " guess");
});

test("not found shows a cross", () => {
  const summary = landmarkrModule.summarize(
    result("landmarkr", { playedDate: TODAY, won: false, parsedData: data }),
    landmarkr,
  );
  assert.equal(summary.value, "✗");
  assert.equal(summary.outcome, "loss");
});

test("stats average guesses over finds", () => {
  const view = landmarkrModule.stats(
    [
      result("landmarkr", { playedDate: "2026-09-12", won: true, guesses: 2 }),
      result("landmarkr", { playedDate: "2026-09-13", won: true, guesses: 4 }),
      result("landmarkr", { playedDate: "2026-09-14", won: false }),
    ],
    "game-landmarkr",
    TODAY,
  );
  assert.equal(view.line, "3.0 guesses");
  assert.equal(detailValue(view, "Found"), "67%");
  assert.equal(view.rankValue, 3);
});
```

- [ ] **Step 2: Register and run to see it fail**

Append ` test/games/landmarkr.test.ts` to the `test` script.
Run: `npm test -w packages/stats`
Expected: FAIL — cannot find module `../../src/games/landmarkr`.

- [ ] **Step 3: Implement**

`packages/stats/src/games/landmarkr.ts`:
```ts
import type { GameResult } from "@dgt/types";
import { isRecord, readGrid } from "./data";
import { formatAverage, formatPercent, mean, plural } from "./format";
import { baseSummary, cardFields, commonStats, dailyResults, detail } from "./generic";
import type { GameModule } from "./types";

function readLandmarkrGrid(result: GameResult): string[] | null {
  return isRecord(result.parsedData) ? readGrid(result.parsedData) : null;
}

export const landmarkrModule: GameModule = {
  parserKey: "landmarkr",
  rankDirection: "asc",

  summarize(result, game) {
    const grid = readLandmarkrGrid(result);
    if (!grid) return baseSummary(result, game);
    if (result.won === true && typeof result.guesses === "number") {
      return {
        ...cardFields(result, game, grid),
        value: String(result.guesses),
        suffix: plural(result.guesses, " guess", " guesses"),
        outcome: "win",
      };
    }
    if (result.won === false) {
      return { ...cardFields(result, game, grid), value: "✗", outcome: "loss" };
    }
    return baseSummary(result, game);
  },

  stats(results, gameId, today) {
    const common = commonStats(results, gameId, today);
    const rows = dailyResults(results, gameId);
    const found = rows.filter((row) => row.won === true);
    const missed = rows.filter((row) => row.won === false).length;
    const decided = found.length + missed;
    const guesses = found
      .map((row) => row.guesses)
      .filter((count): count is number => typeof count === "number");
    const average = mean(guesses);

    return {
      gameId,
      ...common,
      line: average === null ? `${common.played} played` : `${formatAverage(average)} guesses`,
      details: [
        detail("Played", common.played),
        detail("Found", formatPercent(decided === 0 ? null : found.length / decided)),
        detail("Avg guesses", formatAverage(average)),
        detail("Best streak", common.bestStreak),
      ],
      rankValue: average,
    };
  },
};
```

In `packages/stats/src/games/index.ts` add `import { landmarkrModule } from "./landmarkr";` and set:
```ts
const MODULES: readonly GameModule[] = [wordleModule, connectionsModule, catfishingModule, landmarkrModule];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w packages/stats`
Expected: PASS, 78 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add packages/stats
git commit -m "feat(stats): add Landmarkr game module"
```

---

### Task 6: GeoSports / GeoHistory module

**Files:**
- Create: `packages/stats/src/games/geoScore.ts`
- Modify: `packages/stats/src/games/index.ts`, `packages/stats/package.json`
- Test: `packages/stats/test/games/geoScore.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers; `formatInteger`.
- Produces: `createGeoScoreModule(parserKey: string): GameModule` (`"desc"`; details `Played`, `Avg score`, `Best`, `Avg correct`, `Best streak`); registry entries for `"geosports"` and `"geohistory"`.

- [ ] **Step 1: Write the failing tests**

`packages/stats/test/games/geoScore.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getGameModule } from "../../src/games";
import { createGeoScoreModule } from "../../src/games/geoScore";
import { TODAY, detailValue, game, result } from "./helpers";

const geosports = game("geosports", "GeoSports");
const module = createGeoScoreModule("geosports");
const data = (score: number, correct = 4) => ({
  date: "September 14th",
  score,
  maxScore: 1000,
  correct,
  grid: ["🟡🟡🔴🟡🟡"],
});

test("registry has modules for both Geo games", () => {
  assert.equal(getGameModule("geosports").parserKey, "geosports");
  assert.equal(getGameModule("geohistory").parserKey, "geohistory");
});

test("a result shows the score out of the max with separators", () => {
  const summary = module.summarize(
    result("geosports", { playedDate: TODAY, won: false, parsedData: data(845) }),
    geosports,
  );
  assert.equal(summary.value, "845");
  assert.equal(summary.suffix, "/1,000");
  assert.equal(summary.outcome, "score");
  assert.deepEqual(summary.grid, ["🟡🟡🔴🟡🟡"]);
  const perfect = module.summarize(
    result("geosports", { playedDate: TODAY, won: true, parsedData: data(1000) }),
    geosports,
  );
  assert.equal(perfect.value, "1,000");
  assert.equal(perfect.outcome, "win");
});

test("stats average score and rank higher first", () => {
  const view = module.stats(
    [
      result("geosports", { playedDate: "2026-09-13", parsedData: data(800, 3) }),
      result("geosports", { playedDate: "2026-09-14", parsedData: data(900, 4) }),
    ],
    "game-geosports",
    TODAY,
  );
  assert.equal(view.line, "850 avg");
  assert.equal(detailValue(view, "Best"), "900");
  assert.equal(detailValue(view, "Avg correct"), "3.5");
  assert.equal(view.rankValue, 850);
  assert.equal(module.rankDirection, "desc");
});
```

- [ ] **Step 2: Register and run to see it fail**

Append ` test/games/geoScore.test.ts` to the `test` script.
Run: `npm test -w packages/stats`
Expected: FAIL — cannot find module `../../src/games/geoScore`.

- [ ] **Step 3: Implement**

`packages/stats/src/games/geoScore.ts`:
```ts
import type { GameResult } from "@dgt/types";
import { isRecord, readGrid, readNumber } from "./data";
import { formatAverage, formatInteger, mean } from "./format";
import { baseSummary, cardFields, commonStats, dailyResults, detail } from "./generic";
import type { GameModule } from "./types";

interface GeoScoreData {
  grid: string[];
  score: number;
  maxScore: number;
  correct: number;
}

function readGeoScore(result: GameResult): GeoScoreData | null {
  if (!isRecord(result.parsedData)) return null;
  const grid = readGrid(result.parsedData);
  const score = readNumber(result.parsedData, "score");
  const maxScore = readNumber(result.parsedData, "maxScore");
  const correct = readNumber(result.parsedData, "correct");
  if (!grid || score === null || maxScore === null || maxScore <= 0 || correct === null) return null;
  return { grid, score, maxScore, correct };
}

/** Shared by every Geo-family game (same share format, see packages/parsers/src/geoScore.ts). */
export function createGeoScoreModule(parserKey: string): GameModule {
  return {
    parserKey,
    rankDirection: "desc",

    summarize(result, game) {
      const data = readGeoScore(result);
      if (!data) return baseSummary(result, game);
      return {
        ...cardFields(result, game, data.grid),
        value: formatInteger(data.score),
        suffix: `/${formatInteger(data.maxScore)}`,
        outcome: data.score === data.maxScore ? "win" : "score",
      };
    },

    stats(results, gameId, today) {
      const common = commonStats(results, gameId, today);
      const scores = dailyResults(results, gameId).flatMap((row) => {
        const data = readGeoScore(row);
        return data ? [data] : [];
      });
      const average = mean(scores.map((entry) => entry.score));
      const best = scores.length === 0 ? null : Math.max(...scores.map((entry) => entry.score));

      return {
        gameId,
        ...common,
        line: average === null ? `${common.played} played` : `${formatInteger(average)} avg`,
        details: [
          detail("Played", common.played),
          detail("Avg score", formatInteger(average)),
          detail("Best", formatInteger(best)),
          detail("Avg correct", formatAverage(mean(scores.map((entry) => entry.correct)))),
          detail("Best streak", common.bestStreak),
        ],
        rankValue: average,
      };
    },
  };
}
```

In `packages/stats/src/games/index.ts` add `import { createGeoScoreModule } from "./geoScore";` and set:
```ts
const MODULES: readonly GameModule[] = [
  wordleModule,
  connectionsModule,
  catfishingModule,
  landmarkrModule,
  createGeoScoreModule("geosports"),
  createGeoScoreModule("geohistory"),
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w packages/stats`
Expected: PASS, 81 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add packages/stats
git commit -m "feat(stats): add GeoSports/GeoHistory game module"
```

---

### Task 7: Stats integration — standings by metric, feed summaries, date labels

**Files:**
- Modify: `packages/stats/src/groupStats.ts`, `packages/stats/src/feed.ts`, `packages/stats/src/heatmap.ts`, `packages/stats/src/dates.ts`, `packages/stats/package.json`
- Test: rewrite `packages/stats/test/groupStats.test.ts`; modify `packages/stats/test/feed.test.ts`; create `packages/stats/test/dayLabel.test.ts`
- Create: `apps/web/src/lib/result-rows.ts`
- Modify: `apps/web/src/lib/feed-queries.ts`, `apps/web/src/lib/group-queries.ts`, `apps/web/src/lib/group-view.ts`, `apps/web/src/app/groups/[id]/page.tsx` (standings cells only)

**Interfaces:**
- Consumes: Tasks 1–6 registry (`getGameModule`, `summarizeResult`, `GameStatsView`, `ResultSummary`).
- Produces:
  - `buildStandings(members, game: Game, today?: DateString): MemberStanding[]` where `MemberStanding = { actor: FeedActor; view: GameStatsView }`.
  - `FeedItem.summary: ResultSummary`.
  - `groupByDay<T extends { playedDate: DateString }>(items: readonly T[]): Array<{ date: DateString; items: T[] }>`.
  - `toWeeks<T extends { date: DateString }>(days: readonly T[]): (T | null)[][]`.
  - `formatShortDate(date): string` ("Sep 14"), `dayLabel(date, today?): string` ("Today" / "Yesterday" / "Sep 10").
  - Web: `toGame(row: PrismaGame): Game`, `toGameResult(row: PrismaGameResult): GameResult`; `GroupView.viewerId: string`.

- [ ] **Step 1: Write the failing date-label tests**

`packages/stats/test/dayLabel.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { dayLabel, formatShortDate } from "../src/dates";

test("formatShortDate renders month and day in UTC", () => {
  assert.equal(formatShortDate("2026-09-14"), "Sep 14");
  assert.equal(formatShortDate("2026-01-01"), "Jan 1");
});

test("dayLabel says Today, Yesterday, or a short date", () => {
  assert.equal(dayLabel("2026-09-14", "2026-09-14"), "Today");
  assert.equal(dayLabel("2026-09-13", "2026-09-14"), "Yesterday");
  assert.equal(dayLabel("2026-09-10", "2026-09-14"), "Sep 10");
});
```

- [ ] **Step 2: Rewrite the standings tests for metric ranking**

Replace the whole of `packages/stats/test/groupStats.test.ts` with:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Game, GameResult } from "@dgt/types";
import { buildStandings } from "../src/groupStats";

const TODAY = "2026-09-13";

function game(parserKey: string): Game {
  return { id: parserKey, slug: parserKey, name: parserKey, parserKey, url: null };
}

function result(
  userId: string,
  gameId: string,
  playedDate: string,
  fields: Partial<GameResult> = {},
): GameResult {
  return {
    id: `${userId}-${gameId}-${playedDate}`,
    userId,
    gameId,
    playedDate,
    guesses: null,
    won: null,
    rawText: "",
    parsedData: null,
    ...fields,
  };
}

function member(id: string, results: GameResult[]) {
  return { actor: { id, name: id, image: null }, results };
}

const geo = (score: number) => ({
  parsedData: { date: "September 13th", score, maxScore: 1000, correct: 3, grid: ["🟡🟡🔴"] },
});

const ids = (standings: ReturnType<typeof buildStandings>) => standings.map((s) => s.actor.id);

test("buildStandings drops members with no results for the game", () => {
  const standings = buildStandings(
    [
      member("a", [result("a", "wordle", TODAY, { won: true, guesses: 3 })]),
      member("b", [result("b", "connections", TODAY, { won: true })]),
    ],
    game("wordle"),
    TODAY,
  );
  assert.deepEqual(ids(standings), ["a"]);
});

test("Wordle ranks by average guesses, lower first, over a longer streak", () => {
  const standings = buildStandings(
    [
      member("slow", [
        result("slow", "wordle", "2026-09-11", { won: true, guesses: 5 }),
        result("slow", "wordle", "2026-09-12", { won: true, guesses: 5 }),
        result("slow", "wordle", "2026-09-13", { won: true, guesses: 5 }),
      ]),
      member("fast", [result("fast", "wordle", TODAY, { won: true, guesses: 2 })]),
    ],
    game("wordle"),
    TODAY,
  );
  assert.deepEqual(ids(standings), ["fast", "slow"]);
  assert.equal(standings[0].view.line, "2.0 avg");
});

test("GeoSports ranks by average score, higher first", () => {
  const standings = buildStandings(
    [
      member("low", [result("low", "geosports", TODAY, geo(600))]),
      member("high", [result("high", "geosports", TODAY, geo(900))]),
    ],
    game("geosports"),
    TODAY,
  );
  assert.deepEqual(ids(standings), ["high", "low"]);
});

test("members without a rank value sort after everyone with one", () => {
  const standings = buildStandings(
    [
      member("only-losses", [result("only-losses", "wordle", TODAY, { won: false })]),
      member("winner", [result("winner", "wordle", TODAY, { won: true, guesses: 6 })]),
    ],
    game("wordle"),
    TODAY,
  );
  assert.deepEqual(ids(standings), ["winner", "only-losses"]);
});

test("equal metrics break by current streak", () => {
  const standings = buildStandings(
    [
      member("once", [result("once", "wordle", TODAY, { won: true, guesses: 3 })]),
      member("streaky", [
        result("streaky", "wordle", "2026-09-12", { won: true, guesses: 3 }),
        result("streaky", "wordle", "2026-09-13", { won: true, guesses: 3 }),
      ]),
    ],
    game("wordle"),
    TODAY,
  );
  assert.deepEqual(ids(standings), ["streaky", "once"]);
});

test("equal metrics and streaks break by games played", () => {
  const standings = buildStandings(
    [
      member("single", [result("single", "wordle", TODAY, { won: true, guesses: 3 })]),
      member("twice", [
        result("twice", "wordle", "2026-09-01", { won: true, guesses: 3 }),
        result("twice", "wordle", "2026-09-13", { won: true, guesses: 3 }),
      ]),
    ],
    game("wordle"),
    TODAY,
  );
  assert.deepEqual(ids(standings), ["twice", "single"]);
});

test("buildStandings returns an empty array for no members", () => {
  assert.deepEqual(buildStandings([], game("wordle"), TODAY), []);
});
```

- [ ] **Step 3: Give feed test items a summary**

In `packages/stats/test/feed.test.ts`, inside `item()`, add this property after `won: true,`:
```ts
    summary: {
      resultId: `${actorId}-${gameName}-${playedDate}`,
      gameId: GAME.id,
      label: gameName.toUpperCase(),
      value: "3",
      suffix: "/6",
      outcome: "win",
      grid: [],
    },
```

- [ ] **Step 4: Register and run to see failures**

Append ` test/dayLabel.test.ts` to the `test` script.
Run: `npm test -w packages/stats`
Expected: FAIL — `dayLabel`/`formatShortDate` not exported; `groupStats` tests fail (`game` passed where a string is expected, `view` undefined).

- [ ] **Step 5: Implement date labels**

Append to `packages/stats/src/dates.ts`:
```ts
/** "Sep 14" — compact day label for section headings and cards. */
export function formatShortDate(date: DateString): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    toUtcDate(date),
  );
}

/** "Today", "Yesterday", or a short date — for feed day headings. */
export function dayLabel(date: DateString, today: DateString = todayUtc()): string {
  const diff = diffDays(date, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatShortDate(date);
}
```

- [ ] **Step 6: Rank standings by each game's metric**

Replace the whole of `packages/stats/src/groupStats.ts` with:
```ts
import type { Game, GameResult } from "@dgt/types";
import type { DateString } from "./dates";
import { todayUtc } from "./dates";
import type { FeedActor } from "./feed";
import { type GameStatsView, getGameModule } from "./games";

/** One member's stats for a single group-assigned game. */
export interface MemberStanding {
  actor: FeedActor;
  view: GameStatsView;
}

/**
 * One game's standings across a group's members, best-first (docs/BACKLOG.md, Milestone 5 —
 * "Group dashboard & shared stats").
 *
 * Ranked by the game's own metric (see packages/stats/src/games): Wordle by average guesses, lower
 * first; GeoSports by average score, higher first; and so on. Members whose metric is null (e.g.
 * only losses in Wordle) sort after everyone with one. Ties break by current streak, then games
 * played. Members with zero results for this game are dropped — nothing to rank.
 */
export function buildStandings(
  members: ReadonlyArray<{ actor: FeedActor; results: readonly GameResult[] }>,
  game: Game,
  today: DateString = todayUtc(),
): MemberStanding[] {
  const module = getGameModule(game.parserKey);
  return members
    .map((member) => ({ actor: member.actor, view: module.stats(member.results, game.id, today) }))
    .filter((standing) => standing.view.played > 0)
    .sort((a, b) => {
      const aValue = a.view.rankValue;
      const bValue = b.view.rankValue;
      if (aValue !== bValue) {
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        return module.rankDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      if (b.view.currentStreak !== a.view.currentStreak) {
        return b.view.currentStreak - a.view.currentStreak;
      }
      return b.view.played - a.view.played;
    });
}
```

- [ ] **Step 7: Add `summary` to FeedItem and make the day helpers generic**

In `packages/stats/src/feed.ts`:
- Add `import type { ResultSummary } from "./games/types";` below the `DateString` import.
- In `interface FeedItem`, after `won: boolean | null;` add:
  ```ts
  /** Game-specific card data, computed on the server. */
  summary: ResultSummary;
  ```
- Replace `groupByDay` with:
  ```ts
  /** Bucket an already-sorted feed into days, preserving the incoming order and item type. */
  export function groupByDay<T extends { playedDate: DateString }>(
    items: readonly T[],
  ): Array<{ date: DateString; items: T[] }> {
    const days: Array<{ date: DateString; items: T[] }> = [];
    for (const item of items) {
      const last = days[days.length - 1];
      if (last && last.date === item.playedDate) last.items.push(item);
      else days.push({ date: item.playedDate, items: [item] });
    }
    return days;
  }
  ```

In `packages/stats/src/heatmap.ts` replace the `toWeeks` signature and its `weeks` declaration:
```ts
export function toWeeks<T extends { date: DateString }>(days: readonly T[]): (T | null)[][] {
  if (days.length === 0) return [];

  const byDate = new Map(days.map((day) => [day.date, day]));
  const first = startOfWeek(days[0].date);
  const last = addDays(startOfWeek(days[days.length - 1].date), 6);

  const weeks: (T | null)[][] = [];
```
(the loop body below is unchanged).

- [ ] **Step 8: Run stats tests**

Run: `npm test -w packages/stats`
Expected: PASS, 85 tests, 0 failures.

- [ ] **Step 9: Add Prisma row mappers to the web app**

`apps/web/src/lib/result-rows.ts`:
```ts
import type { Game as GameRow, GameResult as GameResultRow } from "@prisma/client";
import { normalizeDate } from "@dgt/stats";
import type { Game, GameResult } from "@dgt/types";

/** Prisma rows → the shared @dgt/types shapes every @dgt/stats function takes. */
export function toGame(row: GameRow): Game {
  return { id: row.id, slug: row.slug, name: row.name, parserKey: row.parserKey, url: row.url };
}

export function toGameResult(row: GameResultRow): GameResult {
  return {
    id: row.id,
    userId: row.userId,
    gameId: row.gameId,
    playedDate: normalizeDate(row.playedDate),
    guesses: row.guesses,
    won: row.won,
    rawText: row.rawText,
    parsedData: (row.parsedData as Record<string, unknown> | null) ?? null,
  };
}
```

- [ ] **Step 10: Attach summaries in the feed queries**

In `apps/web/src/lib/feed-queries.ts`:
- Replace the imports with:
  ```ts
  import { type DateString, type FeedItem, normalizeDate, summarizeResult, toUtcDate } from "@dgt/stats";
  import type { GameResult } from "@dgt/types";
  import { prisma } from "@/lib/prisma";
  import { toGame, toGameResult } from "@/lib/result-rows";
  ```
- Replace the `return rows.map(...)` in `loadFeedResults` with:
  ```ts
  return rows.map((row) => {
    const game = toGame(row.game);
    return {
      id: row.id,
      actor: { id: row.user.id, name: row.user.name ?? "Someone", image: row.user.image ?? null },
      game,
      playedDate: normalizeDate(row.playedDate),
      guesses: row.guesses,
      won: row.won,
      // Computed here so the page never needs rawText/parsedData.
      summary: summarizeResult(toGameResult(row), game),
    };
  });
  ```
- Replace the `return rows.map(...)` in `loadUserResults` with `return rows.map(toGameResult);`.

In `apps/web/src/lib/group-queries.ts`:
- Replace the `@dgt/stats` import with `import { type DateString, type FeedItem, normalizeDate, summarizeResult, toUtcDate } from "@dgt/stats";` and add `import { toGame, toGameResult } from "@/lib/result-rows";`.
- In `loadGroupFeedResults`, replace the returned object (from `return {` through its closing `};`) with:
  ```ts
    const game = toGame(row.game);
    return {
      id: row.id,
      actor: { id: row.user.id, name: row.user.name ?? "Someone", image: row.user.image ?? null },
      game,
      playedDate: normalizeDate(row.playedDate),
      guesses: row.guesses,
      won: row.won,
      summary: summarizeResult(toGameResult(row), game),
      reactions: [...byEmoji.entries()].map(([emoji, { count, reactedByMe }]) => ({
        emoji,
        count,
        reactedByMe,
      })),
    };
  ```
- In `loadGroupMemberResults`, replace the `list.push({ ... });` object with `list.push(toGameResult(row));`.

- [ ] **Step 11: Pass the game to buildStandings and expose the viewer id**

In `apps/web/src/lib/group-view.ts`:
- In `interface GroupView`, after `inviteCode: string;` add `viewerId: string;`.
- In the returned object, after `inviteCode: group.inviteCode,` add `viewerId,`.
- Change `standings: buildStandings(memberResults, game.id),` to `standings: buildStandings(memberResults, game),`.

In `apps/web/src/app/groups/[id]/page.tsx` (temporary until Task 12 rewrites the page):
- Change the header cell `<th className="p-3 font-medium">Win rate</th>` to `<th className="p-3 font-medium">Score</th>`.
- Change `row.stats.currentStreak > 0 ? \`${row.stats.currentStreak} 🔥\` : "—"` to `row.view.currentStreak > 0 ? \`${row.view.currentStreak} 🔥\` : "—"`.
- Change `{row.stats.winRate == null ? "—" : \`${Math.round(row.stats.winRate * 100)}%\`}` to `{row.view.line}`.

- [ ] **Step 12: Verify the web app still type-checks and lints**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: exit 0, no output.
Run: `npm run lint -w apps/web`
Expected: exit 0.

- [ ] **Step 13: Commit**

```bash
git add packages/stats apps/web/src/lib apps/web/src/app/groups
git commit -m "feat(stats): rank standings by game metric and attach card summaries to feed items"
```

---

### Task 8: Theme, UI primitives and app shell

**Files:**
- Modify: `apps/web/tailwind.config.ts`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/components/ui/styles.ts`, `Page.tsx`, `SectionLabel.tsx`, `Menu.tsx`, `ResultCard.tsx`, `CopyLink.tsx`
- Create: `apps/web/src/components/shell/NavTabs.tsx`, `apps/web/src/components/shell/AppHeader.tsx`

**Interfaces:**
- Consumes: `ResultSummary` from `@dgt/stats` (Task 1).
- Produces:
  - `styles.ts` constants: `inputClass`, `primaryButtonClass`, `secondaryButtonClass`, `quietButtonClass`, `dangerButtonClass`, `sectionLabelClass`, `menuItemClass`, `menuPanelClass`.
  - `<Page title? action? children>`; `<SectionLabel aside? children>`; `<Menu label ariaLabel? align? summaryClassName? children>` (client, closes after a click inside).
  - `<ResultCard summary who? footer?>`, `<UnplayedCard name url?>`, `<CardGrid children>`.
  - `<CopyLink label path>` (client).
  - `<AppHeader>` (server) rendered by the root layout; `<NavTabs>` (client).

- [ ] **Step 1: Theme tokens**

Replace `apps/web/tailwind.config.ts` `theme` with:
```ts
  theme: {
    extend: {
      colors: {
        surface: "#161412",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
```

Replace the whole of `apps/web/src/app/globals.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Dark-only "scoreboard" theme — see docs/superpowers/specs/2026-09-14-ui-redesign-design.md. */
:root {
  color-scheme: dark;
}

body {
  background: #0c0a09;
  color: #e7e5e4;
}

/* <details> menus and disclosures draw their own affordances. */
details > summary {
  list-style: none;
  cursor: pointer;
}

details > summary::-webkit-details-marker {
  display: none;
}
```

- [ ] **Step 2: Shared class names**

`apps/web/src/components/ui/styles.ts`:
```ts
/** Shared Tailwind class strings, so every page's controls look the same. */

export const inputClass =
  "w-full rounded-md border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:border-yellow-400 focus:outline-none";

export const primaryButtonClass =
  "rounded-md bg-yellow-400 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-stone-950 transition-opacity hover:opacity-90 disabled:opacity-50";

export const secondaryButtonClass =
  "rounded-md border border-stone-800 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100 disabled:opacity-50";

export const quietButtonClass =
  "font-mono text-xs uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-200";

export const dangerButtonClass =
  "font-mono text-xs uppercase tracking-wider text-red-400 transition-opacity hover:opacity-80";

export const sectionLabelClass = "font-mono text-[11px] uppercase tracking-[0.14em] text-stone-500";

export const menuPanelClass =
  "absolute z-40 mt-2 flex min-w-44 flex-col gap-0.5 rounded-md bg-stone-900 p-1.5 shadow-xl ring-1 ring-stone-800";

export const menuItemClass =
  "rounded px-2.5 py-1.5 text-left text-sm text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100";
```

- [ ] **Step 3: Layout primitives**

`apps/web/src/components/ui/Page.tsx`:
```tsx
import type { ReactNode } from "react";

/** Standard page column. Bottom padding clears the phone tab bar. */
export function Page({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pb-28 pt-6 sm:pb-16">
      {(title || action) && (
        <div className="flex items-center justify-between gap-4">
          {title && (
            <h1 className="font-mono text-sm uppercase tracking-[0.12em] text-stone-100">{title}</h1>
          )}
          {action}
        </div>
      )}
      {children}
    </main>
  );
}
```

`apps/web/src/components/ui/SectionLabel.tsx`:
```tsx
import type { ReactNode } from "react";
import { sectionLabelClass } from "./styles";

export function SectionLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${sectionLabelClass}`}>
      <h2>{children}</h2>
      {aside && <span>{aside}</span>}
    </div>
  );
}
```

`apps/web/src/components/ui/Menu.tsx`:
```tsx
"use client";

import { type ReactNode, useRef } from "react";
import { menuPanelClass } from "./styles";

/**
 * Dropdown built on <details>. Closes after any click inside the panel; the close is deferred so a
 * clicked link still navigates and a clicked submit button still submits its form.
 */
export function Menu({
  label,
  ariaLabel,
  align = "right",
  summaryClassName = "font-mono text-xs uppercase tracking-wider text-stone-400 transition-colors hover:text-stone-200",
  children,
}: {
  label: ReactNode;
  ariaLabel?: string;
  align?: "left" | "right";
  summaryClassName?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={ref} className="relative">
      <summary aria-label={ariaLabel} className={summaryClassName}>
        {label}
      </summary>
      <div
        onClick={() => {
          setTimeout(() => {
            if (ref.current) ref.current.open = false;
          }, 0);
        }}
        className={`${menuPanelClass} ${align === "right" ? "right-0" : "left-0"}`}
      >
        {children}
      </div>
    </details>
  );
}
```

- [ ] **Step 4: Cards and copy link**

`apps/web/src/components/ui/ResultCard.tsx`:
```tsx
import type { ReactNode } from "react";
import type { ResultSummary } from "@dgt/stats";

const VALUE_COLOR: Record<ResultSummary["outcome"], string> = {
  win: "text-green-400",
  score: "text-green-400",
  loss: "text-red-400",
};

const LABEL_CLASS = "font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500";

/** One game result: label, one big number, the share grid. Renders any game's ResultSummary. */
export function ResultCard({
  summary,
  who,
  footer,
}: {
  summary: ResultSummary;
  who?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-1 rounded-lg bg-surface p-3">
      {who && <div className="text-xs text-stone-400">{who}</div>}
      <p className={LABEL_CLASS}>{summary.label}</p>
      <p className={`font-mono text-2xl font-bold ${VALUE_COLOR[summary.outcome]}`}>
        {summary.value}
        {summary.suffix && (
          <span className="text-xs font-normal text-stone-600">{summary.suffix}</span>
        )}
      </p>
      {summary.grid.length > 0 && (
        <div aria-hidden className="text-[11px] leading-tight tracking-[-0.05em]">
          {summary.grid.map((row, index) => (
            <div key={index}>{row}</div>
          ))}
        </div>
      )}
      {footer && <div className="pt-2">{footer}</div>}
    </article>
  );
}

/** A tracked game with no result today. */
export function UnplayedCard({ name, url }: { name: string; url?: string | null }) {
  return (
    <article className="flex flex-col gap-1 rounded-lg p-3 outline-dashed outline-1 outline-stone-800">
      <p className={LABEL_CLASS}>{name}</p>
      <p className="font-mono text-2xl font-bold text-stone-700">—</p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-xs text-stone-400 transition-colors hover:text-stone-200"
        >
          Play ↗
        </a>
      ) : (
        <span className="text-xs text-stone-600">Not played yet</span>
      )}
    </article>
  );
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>;
}
```

`apps/web/src/components/ui/CopyLink.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { sectionLabelClass } from "./styles";

/** A shareable link (follow link, group invite) with a copy button. */
export function CopyLink({ label, path }: { label: string; path: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeoutId);
  }, [copied]);

  const url = `${origin}${path}`;

  return (
    <div className="flex flex-col gap-2">
      <p className={sectionLabelClass}>{label}</p>
      <div className="flex items-center gap-3 border-b border-stone-800 pb-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-stone-400">
          {url}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          }}
          className="font-mono text-xs uppercase tracking-wider text-yellow-400"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Tabs and header**

`apps/web/src/components/shell/NavTabs.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today", isActive: (path: string) => path === "/" },
  { href: "/feed", label: "Feed", isActive: (path: string) => path.startsWith("/feed") || path.startsWith("/follow") },
  { href: "/stats", label: "Stats", isActive: (path: string) => path.startsWith("/stats") || path.startsWith("/u/") },
  { href: "/groups", label: "Groups", isActive: (path: string) => path.startsWith("/groups") },
];

/** Tabs under the header on desktop; a fixed bottom bar on phones. */
export function NavTabs() {
  const pathname = usePathname() ?? "/";

  return (
    <>
      <nav
        aria-label="Main"
        className="mx-auto hidden w-full max-w-2xl gap-6 border-b border-stone-900 px-5 sm:flex"
      >
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 pb-2.5 pt-1 font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
                active
                  ? "border-yellow-400 text-stone-100"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-stone-900 bg-stone-950/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur sm:hidden"
      >
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`font-mono text-[10px] uppercase tracking-[0.1em] ${
                active ? "text-yellow-400" : "text-stone-500"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
```

`apps/web/src/components/shell/AppHeader.tsx`:
```tsx
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Menu } from "@/components/ui/Menu";
import { menuItemClass } from "@/components/ui/styles";
import { NavTabs } from "./NavTabs";

function initialsFor(name?: string | null, email?: string | null): string {
  const source = (name ?? email ?? "?").trim();
  const words = source.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);
  return letters.toUpperCase();
}

/** Logo, account menu and tabs — shared by every page via the root layout. */
export async function AppHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 bg-stone-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 pb-3 pt-4">
        <Link href="/" className="font-mono text-xs tracking-[0.12em] text-yellow-400">
          DAILY//GAMES
        </Link>
        {session?.user ? (
          <Menu
            label={initialsFor(session.user.name, session.user.email)}
            ariaLabel="Account menu"
            summaryClassName="grid h-7 w-7 place-items-center rounded-full bg-stone-800 font-mono text-[10px] text-stone-300 transition-colors hover:bg-stone-700"
          >
            <Link href="/games" className={menuItemClass}>
              My games
            </Link>
            <Link href="/profile" className={menuItemClass}>
              Profile
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className={`${menuItemClass} w-full`}>
                Sign out
              </button>
            </form>
          </Menu>
        ) : (
          <Link
            href="/api/auth/signin"
            className="font-mono text-xs uppercase tracking-wider text-stone-400 transition-colors hover:text-stone-200"
          >
            Sign in
          </Link>
        )}
      </div>
      <NavTabs />
    </header>
  );
}
```

- [ ] **Step 6: Mount the shell in the root layout**

Replace the whole of `apps/web/src/app/layout.tsx` with:
```tsx
import type { Metadata } from "next";
import { AppHeader } from "@/components/shell/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Game Tracker",
  description: "Track your stats and streaks for daily short games.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-950 text-stone-200 antialiased">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: exit 0.
Run: `npm run lint -w apps/web`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/src/app/globals.css apps/web/src/app/layout.tsx apps/web/src/components/ui apps/web/src/components/shell
git commit -m "feat(web): add dark theme, UI primitives and tabbed app shell"
```

---

### Task 9: Today (home) page

**Files:**
- Create: `apps/web/src/lib/today-view.ts`, `apps/web/src/components/SignInPanel.tsx`
- Modify: `apps/web/src/app/page.tsx`, `apps/web/src/components/PasteBox.tsx`
- Delete: `apps/web/src/components/AuthStatus.tsx`, `apps/web/src/components/TodayDashboard.tsx`

**Interfaces:**
- Consumes: `toGame`, `toGameResult` (Task 7); `summarizeResult`, `formatShortDate` (`@dgt/stats`); `Page`, `SectionLabel`, `ResultCard`, `UnplayedCard`, `CardGrid`, style constants (Task 8).
- Produces: `getTodayView(userId: string): Promise<TodayView | null>` with `TodayView = { date: string; games: Array<{ game: Game; summary: ResultSummary | null }> }`; `<SignInPanel />`.

- [ ] **Step 1: Today's data**

`apps/web/src/lib/today-view.ts`:
```ts
import { type ResultSummary, summarizeResult } from "@dgt/stats";
import type { Game } from "@dgt/types";
import { prisma } from "@/lib/prisma";
import { toGame, toGameResult } from "@/lib/result-rows";
import { todayInTimezone } from "@/lib/timezone";

export interface TodayView {
  /** YYYY-MM-DD in the user's own timezone — the same day saveGameResult writes to. */
  date: string;
  games: Array<{ game: Game; summary: ResultSummary | null }>;
}

/** Each tracked game with today's card, or null when it hasn't been played yet. */
export async function getTodayView(userId: string): Promise<TodayView | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  if (!user) return null;

  const date = todayInTimezone(user.timezone);
  const userGames = await prisma.userGame.findMany({
    where: { userId },
    include: { game: true },
    orderBy: { game: { name: "asc" } },
  });
  const rows = await prisma.gameResult.findMany({
    where: { userId, gameId: { in: userGames.map((userGame) => userGame.gameId) }, playedDate: new Date(date) },
  });
  const resultByGameId = new Map(rows.map((row) => [row.gameId, toGameResult(row)]));

  return {
    date,
    games: userGames.map(({ game: row }) => {
      const game = toGame(row);
      const result = resultByGameId.get(game.id);
      return { game, summary: result ? summarizeResult(result, game) : null };
    }),
  };
}
```

- [ ] **Step 2: Sign-in panel (moved out of AuthStatus)**

`apps/web/src/components/SignInPanel.tsx`:
```tsx
import { signIn } from "@/auth";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/styles";

/** Signed-out home: GitHub, Google, or an email magic link. Server Actions only, no client JS. */
export function SignInPanel() {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-mono text-sm uppercase tracking-[0.12em] text-stone-100">
          Track your daily games
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Sign in to save results, follow friends and join groups.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <form
          action={async () => {
            "use server";
            await signIn("github");
          }}
        >
          <button type="submit" className={secondaryButtonClass}>
            GitHub
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button type="submit" className={secondaryButtonClass}>
            Google
          </button>
        </form>
      </div>
      <form
        action={async (formData: FormData) => {
          "use server";
          const email = formData.get("email");
          if (typeof email === "string" && email.length > 0) {
            await signIn("resend", { email, redirectTo: "/" });
          }
        }}
        className="flex gap-2"
      >
        <input
          type="email"
          name="email"
          required
          aria-label="Email"
          placeholder="you@example.com"
          className={inputClass}
        />
        <button type="submit" className={`${primaryButtonClass} shrink-0`}>
          Email link
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 3: Quieter paste box**

In `apps/web/src/components/PasteBox.tsx`:
- Change the `saved` member of `ParsedState` to `| { status: "saved"; gameName: string }`.
- In `startSaving`, replace the `setState({ status: "saved", ... })` call with `setState({ status: "saved", gameName: outcome.gameName });`.
- Replace the entire `return (...)` with:
```tsx
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="game-result" className="sr-only">
        Paste today&apos;s game result
      </label>
      <div className="flex items-start gap-3 border-b border-stone-800 pb-2 focus-within:border-yellow-400">
        <textarea
          id="game-result"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste a result"
          rows={text.includes("\n") ? 6 : 1}
          className="min-h-[1.75rem] flex-1 resize-none bg-transparent font-mono text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSaving || text.trim().length === 0}
          className="pt-0.5 font-mono text-xs uppercase tracking-wider text-yellow-400 disabled:text-stone-700"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
      {state.status === "error" && (
        <p className="text-sm text-red-400" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "saved" && (
        <p className="text-sm text-green-400" role="status">
          Saved {state.gameName}.
        </p>
      )}
      {state.status === "save-error" && (
        <p className="text-sm text-red-400" role="alert">
          {state.gameName}: {state.message}
        </p>
      )}
    </form>
  );
```

- [ ] **Step 4: Home page**

Replace the whole of `apps/web/src/app/page.tsx` with:
```tsx
import Link from "next/link";
import { formatShortDate } from "@dgt/stats";
import { auth } from "@/auth";
import { PasteBox } from "@/components/PasteBox";
import { SignInPanel } from "@/components/SignInPanel";
import { Page } from "@/components/ui/Page";
import { CardGrid, ResultCard, UnplayedCard } from "@/components/ui/ResultCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { getTodayView } from "@/lib/today-view";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <Page>
        <SignInPanel />
        <PasteBox />
      </Page>
    );
  }

  const today = await getTodayView(session.user.id);

  return (
    <Page>
      <PasteBox />
      {today &&
        (today.games.length === 0 ? (
          <p className="text-sm text-stone-500">
            You&apos;re not tracking any games yet.{" "}
            <Link href="/games" className="text-stone-300 underline underline-offset-4">
              Pick some
            </Link>{" "}
            or paste a result above.
          </p>
        ) : (
          <section className="flex flex-col gap-3">
            <SectionLabel
              aside={`${today.games.filter((entry) => entry.summary).length} / ${today.games.length}`}
            >
              {formatShortDate(today.date)}
            </SectionLabel>
            <CardGrid>
              {today.games.map(({ game, summary }) =>
                summary ? (
                  <ResultCard key={game.id} summary={summary} />
                ) : (
                  <UnplayedCard key={game.id} name={game.name} url={game.url} />
                ),
              )}
            </CardGrid>
          </section>
        ))}
    </Page>
  );
}
```

- [ ] **Step 5: Delete replaced components and verify**

Run: `git rm apps/web/src/components/AuthStatus.tsx apps/web/src/components/TodayDashboard.tsx`
Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: exit 0 (nothing else imports those two files).
Run: `npm run lint -w apps/web`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): rebuild the Today page around game cards"
```

---

### Task 10: Stats page and profiles

**Files:**
- Create: `apps/web/src/lib/stats-view.ts`, `apps/web/src/lib/stats-queries.ts`
- Create: `apps/web/src/components/stats/GameStatsCard.tsx`, `ActivityHeatmap.tsx`, `StatsView.tsx`
- Modify: `apps/web/src/lib/demo-data.ts` (rewrite), `apps/web/src/app/stats/page.tsx` (rewrite), `apps/web/src/app/u/[id]/page.tsx` (rewrite), `apps/web/src/lib/feed-queries.ts` (remove `loadUserResults`)
- Delete: `apps/web/src/components/CalendarHeatmap.tsx`, `apps/web/src/components/StatsSummary.tsx`

**Interfaces:**
- Consumes: `buildHeatmap`, `trailingYear`, `toWeeks` (generic, Task 7), `summarizeResult`, `gameStatsView`, `makeFixture`, `toUtcDate`, `todayUtc`, `formatLongDate`, `formatMonthShort` from `@dgt/stats`; `toGame`, `toGameResult`; `unfollow` from `@/lib/follow-actions`; UI primitives.
- Produces: `ClientHeatmapDay`, `StatsPageView`, `buildStatsPageView(results, games, today)`; `loadStatsInputs(userId, today): Promise<{ games: Game[]; results: GameResult[] }>`; `getMyStats(today?): Promise<{ view: StatsPageView; isDemo: boolean }>`; `<StatsView view />`.

- [ ] **Step 1: Display-only stats view builder**

`apps/web/src/lib/stats-view.ts`:
```ts
import {
  type DateString,
  type GameStatsView,
  type ResultSummary,
  buildHeatmap,
  gameStatsView,
  summarizeResult,
  trailingYear,
} from "@dgt/stats";
import type { Game, GameResult } from "@dgt/types";

/** A heatmap cell as the browser sees it: counts and cards, never raw result rows. */
export interface ClientHeatmapDay {
  date: DateString;
  played: number;
  assigned: number;
  ratio: number;
  cards: ResultSummary[];
}

export interface StatsPageView {
  days: ClientHeatmapDay[];
  perGame: Array<{ game: Game; view: GameStatsView }>;
}

/**
 * Everything a stats page renders. Replaces the old rawText/parsedData redaction in /u/[id]:
 * results are summarized here on the server, so the client heatmap only ever gets display data.
 */
export function buildStatsPageView(
  results: readonly GameResult[],
  games: readonly Game[],
  today: DateString,
): StatsPageView {
  const gameById = new Map(games.map((game) => [game.id, game]));
  const days = buildHeatmap(results, games.map((game) => game.id), trailingYear(today)).map((day) => ({
    date: day.date,
    played: day.played,
    assigned: day.assigned,
    ratio: day.ratio,
    cards: day.results.flatMap((result) => {
      const game = gameById.get(result.gameId);
      return game ? [summarizeResult(result, game)] : [];
    }),
  }));

  return { days, perGame: games.map((game) => ({ game, view: gameStatsView(results, game, today) })) };
}
```

`apps/web/src/lib/stats-queries.ts`:
```ts
import { type DateString, toUtcDate, trailingYear } from "@dgt/stats";
import type { Game, GameResult } from "@dgt/types";
import { prisma } from "@/lib/prisma";
import { toGame, toGameResult } from "@/lib/result-rows";

/** A user's tracked games (by name) and their last year of results. */
export async function loadStatsInputs(
  userId: string,
  today: DateString,
): Promise<{ games: Game[]; results: GameResult[] }> {
  const range = trailingYear(today);
  const [userGames, rows] = await Promise.all([
    prisma.userGame.findMany({ where: { userId }, include: { game: true }, orderBy: { game: { name: "asc" } } }),
    prisma.gameResult.findMany({
      where: { userId, playedDate: { gte: toUtcDate(range.start), lte: toUtcDate(range.end) } },
    }),
  ]);
  return { games: userGames.map(({ game }) => toGame(game)), results: rows.map(toGameResult) };
}
```

Replace the whole of `apps/web/src/lib/demo-data.ts` with:
```ts
import { makeFixture, todayUtc } from "@dgt/stats";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadStatsInputs } from "@/lib/stats-queries";
import { type StatsPageView, buildStatsPageView } from "@/lib/stats-view";

export interface MyStats {
  view: StatsPageView;
  /** True for generated sample data (signed out, or a stale session). Drives the notice. */
  isDemo: boolean;
}

/**
 * Signed in → the real thing. Signed out (or a session pointing at a deleted user) → generated
 * sample data, so /stats doubles as a preview of what signing in gets you.
 */
export async function getMyStats(today: string = todayUtc()): Promise<MyStats> {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
    if (user) {
      const { games, results } = await loadStatsInputs(user.id, today);
      return { view: buildStatsPageView(results, games, today), isDemo: false };
    }
  }

  const { games, results } = makeFixture({ end: today });
  return { view: buildStatsPageView(results, games, today), isDemo: true };
}
```

Delete the `loadUserResults` function (and its doc comment) from `apps/web/src/lib/feed-queries.ts`, and remove `GameResult` from its `@dgt/types` import (delete the import line if nothing else uses it) and `toGameResult` stays imported (used by `loadFeedResults`).

- [ ] **Step 2: Stats components**

`apps/web/src/components/stats/GameStatsCard.tsx`:
```tsx
import type { GameStatsView } from "@dgt/stats";

/** The expanded stats for one game: detail figures plus an optional distribution chart. */
export function GameStatsCard({ view }: { view: GameStatsView }) {
  const max = Math.max(1, ...(view.distribution ?? []).map((bar) => bar.count));

  return (
    <div className="mt-3 flex flex-col gap-4 rounded-lg bg-surface p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {view.details.map((entry) => (
          <div key={entry.label}>
            <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500">{entry.label}</dt>
            <dd className="font-mono text-lg text-stone-100">{entry.value}</dd>
          </div>
        ))}
      </dl>
      {view.distribution && (
        <ul className="flex flex-col gap-1 font-mono text-[11px] text-stone-400">
          {view.distribution.map((bar) => (
            <li key={bar.label} className="flex items-center gap-2">
              <span className="w-3 text-right">{bar.label}</span>
              <span className="flex-1">
                <span
                  className={`block h-2.5 rounded-sm ${bar.loss ? "bg-red-400" : "bg-green-400"}`}
                  style={{ width: `${Math.max(2, (bar.count / max) * 100)}%` }}
                />
              </span>
              <span className="w-6 text-right">{bar.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`apps/web/src/components/stats/ActivityHeatmap.tsx`:
```tsx
"use client";

import { useState } from "react";
import { formatLongDate, formatMonthShort, toWeeks } from "@dgt/stats";
import { CardGrid, ResultCard } from "@/components/ui/ResultCard";
import type { ClientHeatmapDay } from "@/lib/stats-view";

function cellClass(day: ClientHeatmapDay): string {
  if (day.played === 0) return "bg-stone-900";
  if (day.ratio <= 0.34) return "bg-green-900";
  if (day.ratio <= 0.67) return "bg-green-700";
  if (day.ratio < 1) return "bg-green-500";
  return "bg-green-400";
}

const isDay = (day: ClientHeatmapDay | null): day is ClientHeatmapDay => day !== null;

/** Year heatmap; selecting a day shows that day's game cards underneath. */
export function ActivityHeatmap({ days }: { days: ClientHeatmapDay[] }) {
  const [selected, setSelected] = useState<ClientHeatmapDay | null>(null);
  const weeks = toWeeks(days);

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-[3px] font-mono text-[10px] text-stone-600">
            {weeks.map((week, index) => {
              const first = week.find(isDay);
              const previous = weeks[index - 1]?.find(isDay);
              const isNewMonth =
                first !== undefined && (!previous || first.date.slice(0, 7) !== previous.date.slice(0, 7));
              return (
                <span key={index} className="w-[11px] shrink-0">
                  {isNewMonth ? formatMonthShort(first.date) : ""}
                </span>
              );
            })}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((day, dayIndex) =>
                  day ? (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelected(day)}
                      title={`${formatLongDate(day.date)} — ${day.played}/${day.assigned}`}
                      aria-label={`${formatLongDate(day.date)}, ${day.played} of ${day.assigned} games played`}
                      className={`h-[11px] w-[11px] rounded-[2px] ${cellClass(day)} ${
                        selected?.date === day.date ? "ring-1 ring-yellow-400 ring-offset-1 ring-offset-stone-950" : ""
                      }`}
                    />
                  ) : (
                    <span key={`pad-${weekIndex}-${dayIndex}`} className="h-[11px] w-[11px]" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-stone-500">
            {formatLongDate(selected.date)} · {selected.played} / {selected.assigned}
          </p>
          {selected.cards.length > 0 ? (
            <CardGrid>
              {selected.cards.map((card) => (
                <ResultCard key={card.resultId} summary={card} />
              ))}
            </CardGrid>
          ) : (
            <p className="text-sm text-stone-600">Nothing played.</p>
          )}
        </div>
      )}
    </section>
  );
}
```

`apps/web/src/components/stats/StatsView.tsx`:
```tsx
import type { StatsPageView } from "@/lib/stats-view";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { GameStatsCard } from "./GameStatsCard";

/** Shared by /stats and /u/[id]: heatmap, then one expandable line per game. */
export function StatsView({ view }: { view: StatsPageView }) {
  return (
    <div className="flex flex-col gap-8">
      <ActivityHeatmap days={view.days} />
      {view.perGame.length === 0 ? (
        <p className="text-sm text-stone-500">No games tracked yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-900">
          {view.perGame.map(({ game, view: stats }) => (
            <li key={game.id}>
              <details className="py-3">
                <summary className="flex items-baseline justify-between gap-4">
                  <span className="text-sm text-stone-200">{game.name}</span>
                  <span className="font-mono text-sm text-green-400">
                    {stats.line}
                    {stats.currentStreak > 0 && <span className="text-stone-500"> · {stats.currentStreak}🔥</span>}
                  </span>
                </summary>
                <GameStatsCard view={stats} />
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Stats page**

Replace the whole of `apps/web/src/app/stats/page.tsx` with:
```tsx
import Link from "next/link";
import { StatsView } from "@/components/stats/StatsView";
import { Page } from "@/components/ui/Page";
import { getMyStats } from "@/lib/demo-data";

// Depends on the session and today's date — never freeze it at build time.
export const dynamic = "force-dynamic";

export const metadata = { title: "Stats — Daily Game Tracker" };

export default async function StatsPage() {
  const { view, isDemo } = await getMyStats();

  return (
    <Page>
      {isDemo && (
        <p role="status" className="text-sm text-stone-500">
          Sample data —{" "}
          <Link href="/" className="text-stone-300 underline underline-offset-4">
            sign in
          </Link>{" "}
          to track your own.
        </p>
      )}
      <StatsView view={view} />
    </Page>
  );
}
```

- [ ] **Step 4: Profile page with unfollow**

Replace the whole of `apps/web/src/app/u/[id]/page.tsx` with:
```tsx
import { notFound, redirect } from "next/navigation";
import { canViewProfile, todayUtc } from "@dgt/stats";
import { auth } from "@/auth";
import { StatsView } from "@/components/stats/StatsView";
import { Page } from "@/components/ui/Page";
import { quietButtonClass } from "@/components/ui/styles";
import { unfollow } from "@/lib/follow-actions";
import { prisma } from "@/lib/prisma";
import { loadStatsInputs } from "@/lib/stats-queries";
import { buildStatsPageView } from "@/lib/stats-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/u/${id}`)}`);
  }
  const viewerId = session.user.id;

  const follows = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const followingIds = follows.map((follow) => follow.followingId);

  // 404 rather than 403: don't confirm whether this id exists to someone who can't see it.
  if (!canViewProfile(viewerId, id, followingIds)) notFound();

  const person = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!person) notFound();

  const today = todayUtc();
  const { games, results } = await loadStatsInputs(id, today);

  return (
    <Page
      title={person.name ?? "Player"}
      action={
        id !== viewerId && followingIds.includes(id) ? (
          <form
            action={async () => {
              "use server";
              await unfollow(id);
              redirect("/feed");
            }}
          >
            <button type="submit" className={quietButtonClass}>
              Unfollow
            </button>
          </form>
        ) : undefined
      }
    >
      <StatsView view={buildStatsPageView(results, games, today)} />
    </Page>
  );
}
```

- [ ] **Step 5: Delete replaced components and verify**

Run: `git rm apps/web/src/components/CalendarHeatmap.tsx apps/web/src/components/StatsSummary.tsx`
Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: exit 0.
Run: `npm run lint -w apps/web`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): per-game stats view shared by /stats and profiles"
```

---

### Task 11: Feed page

**Files:**
- Modify: `apps/web/src/app/feed/page.tsx` (rewrite), `apps/web/src/lib/feed-view.ts`
- Delete: `apps/web/src/components/FeedList.tsx`, `apps/web/src/components/ShareFollowLink.tsx`

**Interfaces:**
- Consumes: `FeedItem.summary`, generic `groupByDay`, `dayLabel`, `todayUtc` (Task 7); `Page`, `SectionLabel`, `Menu`, `ResultCard`, `CardGrid`, `CopyLink`, `menuItemClass`, `sectionLabelClass` (Task 8).
- Produces: `FeedView` without `isDemo`.

- [ ] **Step 1: Drop the unused demo flag**

In `apps/web/src/lib/feed-view.ts` remove the `isDemo` property (and its comment) from `interface FeedView` and remove `isDemo: false,` from the returned object.

- [ ] **Step 2: Rewrite the feed page**

Replace the whole of `apps/web/src/app/feed/page.tsx` with:
```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { dayLabel, groupByDay, todayUtc } from "@dgt/stats";
import { auth } from "@/auth";
import { CopyLink } from "@/components/ui/CopyLink";
import { Menu } from "@/components/ui/Menu";
import { Page } from "@/components/ui/Page";
import { CardGrid, ResultCard } from "@/components/ui/ResultCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { menuItemClass, sectionLabelClass } from "@/components/ui/styles";
import { getFeedView } from "@/lib/feed-view";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Feed — Daily Game Tracker" };

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=%2Ffeed");

  const { game } = await searchParams;
  const [{ following, items }, me] = await Promise.all([
    getFeedView(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { followCode: true } }),
  ]);

  if (following.length === 0) {
    return (
      <Page>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-stone-300">You aren&apos;t following anyone yet.</p>
          <p className="text-sm text-stone-500">
            Send someone your link so they can follow you, and ask for theirs.
          </p>
        </div>
        {me && <CopyLink label="Your follow link" path={`/follow/${me.followCode}`} />}
      </Page>
    );
  }

  const gameOptions = [...new Map(items.map((item) => [item.game.slug, item.game])).values()].sort(
    (a, b) => a.name.localeCompare(b.name),
  );
  // An unknown or repeated ?game= is ignored rather than showing an empty feed.
  const selected = typeof game === "string" ? gameOptions.find((option) => option.slug === game) : undefined;
  const visible = selected ? items.filter((item) => item.game.slug === selected.slug) : items;
  const today = todayUtc();

  return (
    <Page>
      <div className="flex justify-end">
        <Menu label={`${selected ? selected.name : "All games"} ▾`}>
          <Link href="/feed" className={menuItemClass}>
            All games
          </Link>
          {gameOptions.map((option) => (
            <Link
              key={option.slug}
              href={`/feed?game=${encodeURIComponent(option.slug)}`}
              className={menuItemClass}
            >
              {option.name}
            </Link>
          ))}
        </Menu>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-stone-500">
          Nothing in the last 30 days{selected ? ` for ${selected.name}` : ""}.
        </p>
      ) : (
        groupByDay(visible).map((day) => (
          <section key={day.date} className="flex flex-col gap-3">
            <SectionLabel>{dayLabel(day.date, today)}</SectionLabel>
            <CardGrid>
              {day.items.map((item) => (
                <ResultCard
                  key={item.id}
                  summary={item.summary}
                  who={
                    <Link href={`/u/${item.actor.id}`} className="font-medium text-stone-200 hover:underline">
                      {item.actor.name}
                    </Link>
                  }
                />
              ))}
            </CardGrid>
          </section>
        ))
      )}

      <details className="border-t border-stone-900 pt-4">
        <summary className={sectionLabelClass}>Following ({following.length})</summary>
        <div className="flex flex-col gap-6 pt-4">
          <ul className="flex flex-col divide-y divide-stone-900">
            {following.map((actor) => (
              <li key={actor.id}>
                <Link
                  href={`/u/${actor.id}`}
                  className="block py-2 text-sm text-stone-300 transition-colors hover:text-stone-100"
                >
                  {actor.name}
                </Link>
              </li>
            ))}
          </ul>
          {me && <CopyLink label="Your follow link" path={`/follow/${me.followCode}`} />}
        </div>
      </details>
    </Page>
  );
}
```

- [ ] **Step 3: Delete replaced components and verify**

Run: `git rm apps/web/src/components/FeedList.tsx apps/web/src/components/ShareFollowLink.tsx`
Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: exit 0.
Run: `npm run lint -w apps/web`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): feed as day-grouped game cards with a game filter"
```

---

### Task 12: Groups pages

**Files:**
- Create: `apps/web/src/components/groups/Reactions.tsx`, `apps/web/src/components/groups/GroupManage.tsx`
- Modify: `apps/web/src/app/groups/page.tsx` (rewrite), `apps/web/src/app/groups/[id]/page.tsx` (rewrite)
- Delete: `apps/web/src/components/GroupFeedList.tsx`, `apps/web/src/components/ShareGroupLink.tsx`

**Interfaces:**
- Consumes: `GroupView` (`viewerId`, `standings: { game, standings: MemberStanding[] }[]`, `feed: GroupFeedItem[]`), `ReactionSummary`, all group server actions (unchanged), `REACTION_EMOJI`, `toGame`, UI primitives, `PasswordField`, `JoinGroupForm`, `DeleteGroupButton`, `GameLink`.
- Produces: `<Reactions groupId resultId reactions />`, `<GroupManage group assignableGames />`.

- [ ] **Step 1: Reactions**

`apps/web/src/components/groups/Reactions.tsx`:
```tsx
import { REACTION_EMOJI } from "@dgt/types";
import { toggleReaction } from "@/app/groups/actions";
import type { ReactionSummary } from "@/lib/group-queries";

function ReactionButton({
  groupId,
  resultId,
  emoji,
  count,
  active,
}: {
  groupId: string;
  resultId: string;
  emoji: string;
  count: number;
  active: boolean;
}) {
  return (
    <form action={toggleReaction}>
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="gameResultId" value={resultId} />
      <input type="hidden" name="emoji" value={emoji} />
      <button
        type="submit"
        aria-pressed={active}
        className={`rounded-full px-2 py-0.5 text-xs ring-1 transition-colors ${
          active ? "bg-yellow-400/15 text-yellow-300 ring-yellow-400/60" : "text-stone-400 ring-stone-800 hover:ring-stone-600"
        }`}
      >
        {emoji}
        {count > 0 ? ` ${count}` : ""}
      </button>
    </form>
  );
}

/** Reactions already used on a result, plus a "+" picker for the rest. Toggling uses toggleReaction. */
export function Reactions({
  groupId,
  resultId,
  reactions,
}: {
  groupId: string;
  resultId: string;
  reactions: ReactionSummary[];
}) {
  const used = reactions.filter((reaction) => reaction.count > 0);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {used.map((reaction) => (
        <ReactionButton
          key={reaction.emoji}
          groupId={groupId}
          resultId={resultId}
          emoji={reaction.emoji}
          count={reaction.count}
          active={reaction.reactedByMe}
        />
      ))}
      <details className="relative">
        <summary
          aria-label="Add reaction"
          className="rounded-full px-2 py-0.5 text-xs text-stone-500 ring-1 ring-stone-800 transition-colors hover:text-stone-300"
        >
          +
        </summary>
        <div className="absolute left-0 z-20 mt-1 flex gap-1 rounded-md bg-stone-900 p-1.5 ring-1 ring-stone-800">
          {REACTION_EMOJI.map((emoji) => (
            <ReactionButton
              key={emoji}
              groupId={groupId}
              resultId={resultId}
              emoji={emoji}
              count={0}
              active={reactions.some((reaction) => reaction.emoji === emoji && reaction.reactedByMe)}
            />
          ))}
        </div>
      </details>
    </div>
  );
}
```

- [ ] **Step 2: Group management panel**

`apps/web/src/components/groups/GroupManage.tsx`:
```tsx
import type { Game } from "@dgt/types";
import {
  assignGameToGroup,
  deleteGroup,
  leaveGroup,
  removeGameFromGroup,
  resetGroupPassword,
  updateMemberRole,
} from "@/app/groups/actions";
import { DeleteGroupButton } from "@/components/DeleteGroupButton";
import { GameLink } from "@/components/GameLink";
import { PasswordField } from "@/components/PasswordField";
import { CopyLink } from "@/components/ui/CopyLink";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  dangerButtonClass,
  inputClass,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";
import type { GroupView } from "@/lib/group-view";

/** Invite link, roster/roles, game assignment, password and leave/delete — same rules as before. */
export function GroupManage({ group, assignableGames }: { group: GroupView; assignableGames: Game[] }) {
  const isOwner = group.viewerRole === "owner";
  const canManageGames = isOwner || group.viewerRole === "admin";

  return (
    <div className="flex flex-col gap-8 rounded-lg bg-surface p-4">
      <CopyLink label="Invite link" path={`/groups/join/${group.inviteCode}`} />

      <section className="flex flex-col gap-2">
        <SectionLabel>Members ({group.members.length})</SectionLabel>
        <ul className="flex flex-col divide-y divide-stone-900">
          {group.members.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-stone-200">{member.name}</span>
              {isOwner && member.role !== "owner" ? (
                <form action={updateMemberRole}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="userId" value={member.id} />
                  <input type="hidden" name="role" value={member.role === "admin" ? "member" : "admin"} />
                  <button type="submit" className={quietButtonClass}>
                    {member.role === "admin" ? "Make member" : "Make admin"}
                  </button>
                </form>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500">{member.role}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Games ({group.games.length})</SectionLabel>
        {group.games.length === 0 ? (
          <p className="text-sm text-stone-500">No games assigned yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-stone-900">
            {group.games.map((game) => (
              <li key={game.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <GameLink name={game.name} url={game.url} />
                {canManageGames && (
                  <form action={removeGameFromGroup}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="gameId" value={game.id} />
                    <button type="submit" className={quietButtonClass}>
                      Remove
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {canManageGames && assignableGames.length > 0 && (
          <form action={assignGameToGroup} className="flex gap-2">
            <input type="hidden" name="groupId" value={group.id} />
            <select name="gameId" required aria-label="Game to assign" className={inputClass}>
              {assignableGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
            <button type="submit" className={`${primaryButtonClass} shrink-0`}>
              Assign
            </button>
          </form>
        )}
      </section>

      {isOwner && (
        <section className="flex flex-col gap-2">
          <SectionLabel>{group.hasPassword ? "Password" : "Join password"}</SectionLabel>
          <form action={resetGroupPassword} className="flex gap-2">
            <input type="hidden" name="groupId" value={group.id} />
            <PasswordField
              name="password"
              placeholder={group.hasPassword ? "New password (blank removes it)" : "Set a password"}
              className="flex-1"
            />
            <button type="submit" className={`${secondaryButtonClass} shrink-0`}>
              Save
            </button>
          </form>
        </section>
      )}

      <section className="flex flex-col items-start gap-2 border-t border-stone-900 pt-4">
        {isOwner ? (
          <form action={deleteGroup}>
            <input type="hidden" name="groupId" value={group.id} />
            <DeleteGroupButton groupName={group.name} />
          </form>
        ) : (
          <form action={leaveGroup}>
            <input type="hidden" name="groupId" value={group.id} />
            <button type="submit" className={dangerButtonClass}>
              Leave group
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Groups list page**

Replace the whole of `apps/web/src/app/groups/page.tsx` with:
```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JoinGroupForm } from "@/components/JoinGroupForm";
import { PasswordField } from "@/components/PasswordField";
import { Page } from "@/components/ui/Page";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { inputClass, primaryButtonClass } from "@/components/ui/styles";
import { prisma } from "@/lib/prisma";
import { createGroup } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Groups — Daily Game Tracker" };

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    include: { group: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <Page>
      {memberships.length === 0 ? (
        <p className="text-sm text-stone-500">You&apos;re not in any groups yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-900">
          {memberships.map(({ group }) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="flex items-baseline justify-between gap-4 py-3 transition-colors hover:text-stone-100"
              >
                <span className="text-sm text-stone-200">{group.name}</span>
                <span className="text-xs text-stone-500">
                  {group._count.members} member{group._count.members === 1 ? "" : "s"} ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <details open={memberships.length === 0}>
        <summary className="font-mono text-xs uppercase tracking-wider text-yellow-400">+ Create or join</summary>
        <div className="grid gap-8 pt-5 sm:grid-cols-2">
          <section className="flex flex-col gap-3">
            <SectionLabel>Create</SectionLabel>
            <form action={createGroup} className="flex flex-col gap-3">
              <input name="name" required aria-label="Group name" placeholder="Group name" className={inputClass} />
              <PasswordField name="password" placeholder="Password (optional)" />
              <button type="submit" className={`${primaryButtonClass} self-start`}>
                Create
              </button>
            </form>
          </section>
          <section className="flex flex-col gap-3">
            <SectionLabel>Join</SectionLabel>
            <JoinGroupForm />
          </section>
        </div>
      </details>
    </Page>
  );
}
```

- [ ] **Step 4: Group detail page**

Replace the whole of `apps/web/src/app/groups/[id]/page.tsx` with:
```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { dayLabel, groupByDay, todayUtc } from "@dgt/stats";
import { auth } from "@/auth";
import { GroupManage } from "@/components/groups/GroupManage";
import { Reactions } from "@/components/groups/Reactions";
import { JoinGroupForm } from "@/components/JoinGroupForm";
import { Menu } from "@/components/ui/Menu";
import { Page } from "@/components/ui/Page";
import { CardGrid, ResultCard } from "@/components/ui/ResultCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { menuItemClass, sectionLabelClass } from "@/components/ui/styles";
import { getGroupView } from "@/lib/group-view";
import { prisma } from "@/lib/prisma";
import { toGame } from "@/lib/result-rows";

export const dynamic = "force-dynamic";

/**
 * One group: standings and feed for the selected game (?game=<slug>, defaulting to the first
 * assigned game), with invite/roster/games/password behind "Invite & manage". Non-members only
 * see the name, member count and a join form — getGroupView never loads results for them.
 */
export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ game?: string | string[] }>;
}) {
  const { id } = await params;
  const { game: gameParam } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=%2Fgroups%2F${id}`);
  }

  const group = await getGroupView(id, session.user.id);
  if (!group) notFound();

  if (group.viewerRole === null) {
    return (
      <Page title={group.name}>
        <p className="text-sm text-stone-500">
          {group.members.length} member{group.members.length === 1 ? "" : "s"} ·{" "}
          {group.hasPassword ? "password required" : "open to join"}
        </p>
        <JoinGroupForm code={group.inviteCode} hasPassword={group.hasPassword} />
      </Page>
    );
  }

  const canManageGames = group.viewerRole === "owner" || group.viewerRole === "admin";
  const assignedIds = new Set(group.games.map((game) => game.id));
  const assignableGames = canManageGames
    ? (await prisma.game.findMany({ orderBy: { name: "asc" } }))
        .filter((game) => !assignedIds.has(game.id))
        .map(toGame)
    : [];

  const selected = group.standings.find((entry) => entry.game.slug === gameParam) ?? group.standings[0];
  const feed = selected ? group.feed.filter((item) => item.game.id === selected.game.id) : [];
  const today = todayUtc();

  return (
    <Page
      title={group.name}
      action={
        selected && group.games.length > 1 ? (
          <Menu label={`${selected.game.name} ▾`}>
            {group.games.map((game) => (
              <Link
                key={game.id}
                href={`/groups/${group.id}?game=${encodeURIComponent(game.slug)}`}
                className={menuItemClass}
              >
                {game.name}
              </Link>
            ))}
          </Menu>
        ) : undefined
      }
    >
      {selected ? (
        <>
          <section className="flex flex-col gap-2">
            <SectionLabel aside={selected.game.name}>Standings</SectionLabel>
            {selected.standings.length === 0 ? (
              <p className="text-sm text-stone-500">Nobody&apos;s played {selected.game.name} yet.</p>
            ) : (
              <ol className="flex flex-col divide-y divide-stone-900">
                {selected.standings.map((row, index) => {
                  const isMe = row.actor.id === group.viewerId;
                  return (
                    <li
                      key={row.actor.id}
                      className={`flex items-baseline justify-between gap-4 py-2.5 text-sm ${
                        isMe ? "text-yellow-400" : "text-stone-200"
                      }`}
                    >
                      <span>
                        <span className="inline-block w-6 font-mono text-stone-600">{index + 1}</span>
                        {isMe ? "You" : row.actor.name}
                      </span>
                      <span className={`font-mono ${isMe ? "text-yellow-400" : "text-green-400"}`}>
                        {row.view.line}
                        {row.view.currentStreak > 0 && (
                          <span className="text-stone-500"> · {row.view.currentStreak}🔥</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {groupByDay(feed).map((day) => (
            <section key={day.date} className="flex flex-col gap-3">
              <SectionLabel>{dayLabel(day.date, today)}</SectionLabel>
              <CardGrid>
                {day.items.map((item) => (
                  <ResultCard
                    key={item.id}
                    summary={item.summary}
                    who={item.actor.id === group.viewerId ? "You" : item.actor.name}
                    footer={<Reactions groupId={group.id} resultId={item.id} reactions={item.reactions} />}
                  />
                ))}
              </CardGrid>
            </section>
          ))}
        </>
      ) : (
        <p className="text-sm text-stone-500">
          No games assigned yet.{canManageGames ? " Add one under Invite & manage." : ""}
        </p>
      )}

      <details className="border-t border-stone-900 pt-4">
        <summary className={sectionLabelClass}>⋯ Invite &amp; manage</summary>
        <div className="pt-4">
          <GroupManage group={group} assignableGames={assignableGames} />
        </div>
      </details>
    </Page>
  );
}
```

- [ ] **Step 5: Delete replaced components and verify**

Run: `git rm apps/web/src/components/GroupFeedList.tsx apps/web/src/components/ShareGroupLink.tsx`
Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: exit 0.
Run: `npm run lint -w apps/web`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): group page with per-game standings, cards and folded management"
```

---

### Task 13: Restyle remaining pages and form components

**Files:**
- Modify (rewrite): `apps/web/src/app/games/page.tsx`, `apps/web/src/app/profile/page.tsx`, `apps/web/src/app/follow/[code]/page.tsx`, `apps/web/src/app/groups/join/[code]/page.tsx`
- Modify: `apps/web/src/components/JoinGroupForm.tsx`, `PasswordField.tsx`, `DeleteGroupButton.tsx`, `GameLink.tsx`

**Interfaces:**
- Consumes: `Page`, style constants (Task 8). Server actions `toggleGameTracking`, `updateProfile`, `followByCode`, `joinGroupByCode` unchanged.
- Produces: no new exports.

- [ ] **Step 1: My games**

Replace the whole of `apps/web/src/app/games/page.tsx` with:
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GameLink } from "@/components/GameLink";
import { Page } from "@/components/ui/Page";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/styles";
import { prisma } from "@/lib/prisma";
import { toggleGameTracking } from "./actions";

export const metadata = { title: "My games — Daily Game Tracker" };

/** Track/untrack games. Pasting a result already tracks its game, so this is mostly for turning one off. */
export default async function GamesPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const [games, userGames] = await Promise.all([
    prisma.game.findMany({ orderBy: { name: "asc" } }),
    prisma.userGame.findMany({ where: { userId: session.user.id } }),
  ]);
  const trackedGameIds = new Set(userGames.map((userGame) => userGame.gameId));

  return (
    <Page title="My games">
      <p className="text-sm text-stone-500">
        Tracked games show on Today and in Stats. Pasting a result tracks its game automatically.
      </p>
      {games.length === 0 ? (
        <p className="text-sm text-stone-500">
          No games are set up on the server yet — run <code className="font-mono">npm run db:seed</code>.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-900">
          {games.map((game) => {
            const tracked = trackedGameIds.has(game.id);
            return (
              <li key={game.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <GameLink name={game.name} url={game.url} />
                <form action={toggleGameTracking}>
                  <input type="hidden" name="gameId" value={game.id} />
                  <input type="hidden" name="tracked" value={tracked ? "1" : "0"} />
                  <button type="submit" className={tracked ? secondaryButtonClass : primaryButtonClass}>
                    {tracked ? "Untrack" : "Track"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
```

- [ ] **Step 2: Profile**

Replace the whole of `apps/web/src/app/profile/page.tsx` with:
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Page } from "@/components/ui/Page";
import { inputClass, primaryButtonClass, sectionLabelClass } from "@/components/ui/styles";
import { prisma } from "@/lib/prisma";
import { updateProfile } from "./actions";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/");

  // Node's Intl gives the full IANA timezone list — nothing hardcoded to maintain.
  const timezones = Intl.supportedValuesOf("timeZone");

  return (
    <Page title="Profile">
      <form action={updateProfile} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className={sectionLabelClass}>Display name</span>
          <input name="name" type="text" defaultValue={user.name ?? ""} placeholder="Your name" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={sectionLabelClass}>Timezone</span>
          <select name="timezone" defaultValue={user.timezone} className={inputClass}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <span className="text-xs text-stone-500">Decides which day a pasted result counts toward.</span>
        </label>
        <button type="submit" className={`${primaryButtonClass} self-start`}>
          Save
        </button>
      </form>
      <p className="text-sm text-stone-500">Signed in as {user.email}</p>
    </Page>
  );
}
```

- [ ] **Step 3: Follow confirmation**

Replace the whole of `apps/web/src/app/follow/[code]/page.tsx` with:
```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Page } from "@/components/ui/Page";
import { primaryButtonClass, quietButtonClass } from "@/components/ui/styles";
import { followByCode } from "@/lib/follow-actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Follow — Daily Game Tracker" };

export default async function FollowPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { code } = await params;
  const { done } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/follow/${code}`)}`);
  }

  const target = await prisma.user.findUnique({
    where: { followCode: code },
    select: { id: true, name: true },
  });

  const shell = (children: React.ReactNode) => (
    <Page>
      <div className="flex flex-col items-start gap-4">{children}</div>
      <Link href="/feed" className={quietButtonClass}>
        Go to your feed
      </Link>
    </Page>
  );

  if (!target) {
    return shell(<p className="text-sm text-stone-300">This follow link isn&apos;t valid. Ask for a fresh one.</p>);
  }

  if (target.id === session.user.id) {
    return shell(<p className="text-sm text-stone-300">That&apos;s your own follow link — share it with someone else.</p>);
  }

  // `done` only picks the wording; whether the follow exists always comes from the database.
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
    select: { followerId: true },
  });

  const name = target.name ?? "this person";

  if (existing) {
    return shell(
      <p className="text-sm text-stone-300">
        {done === "ok" ? `You now follow ${name}.` : `You already follow ${name}.`}
      </p>,
    );
  }

  return shell(
    <>
      <h1 className="font-mono text-sm uppercase tracking-[0.12em] text-stone-100">Follow {name}?</h1>
      <p className="text-sm text-stone-500">You&apos;ll see their daily game results in your feed.</p>
      <form
        action={async () => {
          "use server";
          const outcome = await followByCode(code);
          redirect(`/follow/${code}?done=${outcome.status}`);
        }}
      >
        <button type="submit" className={primaryButtonClass}>
          Follow
        </button>
      </form>
    </>,
  );
}
```

- [ ] **Step 4: Join by invite link**

Replace the whole of `apps/web/src/app/groups/join/[code]/page.tsx` with:
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JoinGroupForm } from "@/components/JoinGroupForm";
import { Page } from "@/components/ui/Page";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Join a group — Daily Game Tracker" };

/** Landing page for a shared group invite link — mirrors /follow/[code]. */
export default async function JoinGroupByCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=%2Fgroups%2Fjoin%2F${code}`);
  }

  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    include: { _count: { select: { members: true } } },
  });

  if (!group) {
    return (
      <Page>
        <p className="text-sm text-stone-300">
          This invite link isn&apos;t valid — the group may have been deleted, or the link was mistyped.
        </p>
      </Page>
    );
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  });
  if (existing) redirect(`/groups/${group.id}`);

  return (
    <Page title={`Join ${group.name}`}>
      <p className="text-sm text-stone-500">
        {group._count.members} member{group._count.members === 1 ? "" : "s"}
      </p>
      <JoinGroupForm code={code} hasPassword={group.passwordHash != null} />
    </Page>
  );
}
```

- [ ] **Step 5: Form components**

In `apps/web/src/components/JoinGroupForm.tsx`:
- Add `import { inputClass, primaryButtonClass, sectionLabelClass } from "@/components/ui/styles";`.
- Both `<label ...>` elements: set `className={sectionLabelClass}`.
- Both `<input ...>` elements: set `className={inputClass}`.
- The submit `<button>`: set `className={\`${primaryButtonClass} self-start\`}`.
- The error `<p>`: set `className="text-sm text-red-400"`.

In `apps/web/src/components/PasswordField.tsx`:
- Add `import { inputClass } from "@/components/ui/styles";`.
- The `<input>`: set `className={\`${inputClass} pr-14\`}`.
- The toggle `<button>`: set `className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-wider text-stone-500 hover:text-stone-300"`.

In `apps/web/src/components/DeleteGroupButton.tsx`:
- Add `import { dangerButtonClass } from "@/components/ui/styles";` below the `"use client";` line.
- The `<button>`: set `className={dangerButtonClass}`.

In `apps/web/src/components/GameLink.tsx`:
- The `<a>`: set ``className={`underline decoration-stone-600 underline-offset-4 transition-colors hover:text-stone-100 ${className ?? ""}`}``.
- Update its doc comment's list of call sites to: "/games, group management, and anywhere else a game's name links out."

- [ ] **Step 6: Confirm no light-theme classes or Back links remain**

Run: `git grep -n -E "dark:|black/|bg-foreground|text-background|Back to" -- apps/web/src`
Expected: no output.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: exit 0.
Run: `npm run lint -w apps/web`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): restyle games, profile, follow and join pages"
```

---

### Task 14: Full verification

**Files:** none (fixes only if a check fails, committed separately).

- [ ] **Step 1: Unit tests**

Run: `npm test -w packages/stats`
Expected: PASS, 85 tests, 0 failures.
Run: `npm test -w packages/parsers`
Expected: PASS (unchanged package).

- [ ] **Step 2: Lint and production build**

Run: `npm run lint -w apps/web`
Expected: exit 0.
Run: `npm run build -w apps/web`
Expected: "Compiled successfully" and the route list; exit 0. (Needs the local `.env`; every DB/auth page is dynamic, so the build does not query the database.)

- [ ] **Step 3: Run the app and check every page**

Start: `npm run dev` (background), then open `http://localhost:3000`.
At 1280px wide and again at 390px wide, check:
- Signed out: `/` shows sign-in panel + paste box; `/stats` shows the sample-data notice and heatmap; header shows "Sign in"; tabs render (bottom bar on phone).
- Signed in: `/` shows today's cards (dashed "Play ↗" for unplayed); pasting a Wordle result turns its card green with the grid.
- `/stats`: tapping a heatmap day shows that day's cards; tapping a game line expands its stats card (Wordle shows the distribution).
- `/feed`: day sections, game filter menu narrows to one game and back; "Following" expands with the copy link; a name opens `/u/[id]`, which has "Unfollow".
- `/groups`: list, "+ Create or join" expands both forms. `/groups/[id]`: game menu switches standings and feed; reactions toggle; "⋯ Invite & manage" shows roster, games, password, leave/delete per role.
- Avatar menu: My games, Profile, Sign out all work and the menu closes after a choice.
- No page scrolls horizontally at 390px (the heatmap scrolls inside its own container).

Expected: all checks pass. Fix anything that doesn't in a separate commit with a message describing the fix.

- [ ] **Step 4: Stop the dev server and the brainstorm companion**

Stop the `npm run dev` background process. Stop the visual companion:
`bash "/c/Users/Massimo/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/brainstorming/scripts/stop-server.sh" "/c/Users/Massimo/Documents/Projects/DailyGameTracker/.superpowers/brainstorm/8179-1789433610"`

