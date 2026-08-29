"use client";

import { useState } from "react";
import { parseGameResult, UnparsableTextError } from "@dgt/parsers";

type ParsedState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; gameName: string; guesses?: number; won?: boolean };

/**
 * The core "paste box" flow (docs/BACKLOG.md, Milestone 2).
 *
 * This is a client-side-only starting point: it parses and previews a result, but doesn't save
 * anything yet — that needs the API route + database work from Milestone 1/3. Swap the TODO below
 * for a real fetch() once `POST /api/results` exists.
 */
export function PasteBox() {
  const [text, setText] = useState("");
  const [state, setState] = useState<ParsedState>({ status: "idle" });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      const { parser, result } = parseGameResult(text);
      setState({
        status: "success",
        gameName: parser.name,
        guesses: result.guesses,
        won: result.won,
      });
      // TODO (Milestone 3): POST { gameKey: parser.key, rawText: text, ...result } to
      // /api/results once auth + the database are wired up, instead of only previewing here.
    } catch (error) {
      const message =
        error instanceof UnparsableTextError
          ? error.message
          : "Something went wrong parsing that — check the text and try again.";
      setState({ status: "error", message });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-3">
      <label htmlFor="game-result" className="text-sm font-medium">
        Paste today&apos;s game result
      </label>
      <textarea
        id="game-result"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={"Wordle 1,234 3/6\n\n⬛🟨⬛⬛⬛\n⬛🟩🟨⬛⬛\n🟩🟩🟩🟩🟩"}
        rows={8}
        className="w-full rounded-md border border-black/10 bg-transparent p-3 font-mono text-sm dark:border-white/20"
      />
      <button
        type="submit"
        className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Parse result
      </button>

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-green-700 dark:text-green-400">
          Parsed as <strong>{state.gameName}</strong>
          {state.won !== undefined && <> — {state.won ? "won" : "lost"}</>}
          {state.guesses !== undefined && <> in {state.guesses} guesses</>}.
        </p>
      )}
    </form>
  );
}
