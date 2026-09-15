"use client";

import { useState, useTransition } from "react";
import { parseGameResult, UnparsableTextError } from "@dgt/parsers";
import { saveGameResult } from "@/lib/game-results";

type ParsedState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "saved"; gameName: string }
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
        setState({ status: "saved", gameName: outcome.gameName });
      }
    });
  }

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
}
