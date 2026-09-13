"use client";

import { useState, useTransition } from "react";
import { parseGameResult, UnparsableTextError } from "@dgt/parsers";
import { saveGameResult } from "@/lib/game-results";

type ParsedState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "saved"; gameName: string; guesses?: number; won?: boolean }
  | { status: "save-error"; gameName: string; message: string };

/**
 * The paste-box flow (docs/BACKLOG.md, "Build the paste-box UI on the homepage"): paste →
 * parsed preview → saved, in one submit.
 *
 * Parsing happens twice, deliberately: once here, client-side, purely for instant feedback
 * (garbled text shouldn't need a round trip to find out it's garbled) — and again inside
 * `saveGameResult`, server-side, which is the version that actually gets persisted. The server
 * never trusts a client-supplied parsed result; see the comment on `saveGameResult` for why.
 */
export function PasteBox() {
  const [text, setText] = useState("");
  const [state, setState] = useState<ParsedState>({ status: "idle" });
  const [isSaving, startSaving] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    let parsed: ReturnType<typeof parseGameResult>;
    try {
      parsed = parseGameResult(text);
    } catch (error) {
      const message =
        error instanceof UnparsableTextError
          ? error.message
          : "Something went wrong parsing that — check the text and try again.";
      setState({ status: "error", message });
      return;
    }

    const { parser } = parsed;

    startSaving(async () => {
      const outcome = await saveGameResult(text);
      if (outcome.status === "error") {
        setState({ status: "save-error", gameName: parser.name, message: outcome.message });
      } else {
        setState({
          status: "saved",
          gameName: outcome.gameName,
          guesses: outcome.guesses,
          won: outcome.won,
        });
      }
    });
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
        disabled={isSaving}
        className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSaving ? "Saving…" : "Parse & save result"}
      </button>

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "saved" && (
        <p className="text-sm text-green-700 dark:text-green-400">
          Parsed as <strong>{state.gameName}</strong>
          {state.won !== undefined && <> — {state.won ? "won" : "lost"}</>}
          {state.guesses !== undefined && <> in {state.guesses} guesses</>}. Saved.
        </p>
      )}
      {state.status === "save-error" && (
        <p className="text-sm text-amber-700 dark:text-amber-400" role="alert">
          Parsed as <strong>{state.gameName}</strong>, but couldn&apos;t save it:{" "}
          {state.message}
        </p>
      )}
    </form>
  );
}
