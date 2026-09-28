"use client";

import { useState, useTransition } from "react";
import { parseGameResult, UnparsableTextError } from "@dgt/parsers";
import { saveGameResult } from "@/lib/game-results";
import { inputClass, primaryButtonClass, quietButtonClass } from "@/components/ui/styles";

type ParsedState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "saved"; gameName: string }
  | { status: "save-error"; gameName: string; message: string }
  | { status: "confirming"; gameName: string; reason: string };

/**
 * The paste box (docs/BACKLOG.md, "Build the paste-box UI on the homepage" and "Historical result
 * import"): paste → parsed preview → saved, in one submit — the same box handles both a normal
 * daily paste and backfilling an old result, by request ("I was hoping that this would be all
 * through the same box"), rather than a separate import page.
 *
 * Parsing happens twice, deliberately: once here, client-side, purely for instant feedback
 * (garbled text shouldn't need a round trip to find out it's garbled) — and again inside
 * `saveGameResult`, server-side, which is the version that actually gets persisted. The server
 * never trusts a client-supplied parsed result; see the comment on `saveGameResult` for why.
 *
 * Most pastes save immediately, same as always — `saveGameResult` only comes back with
 * `needs-confirmation` for a Geo-family result (GeoSports/GeoHistory) whose date doesn't match
 * today, i.e. an old screenshot being backfilled, where the year genuinely can't be known for
 * sure. That's the one case this shows a second step: an editable, pre-filled date to confirm
 * before saving.
 */
export function PasteBox() {
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
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
      } else if (outcome.status === "needs-confirmation") {
        setDate(outcome.proposedDate);
        setState({ status: "confirming", gameName: outcome.gameName, reason: outcome.reason });
      } else {
        setState({ status: "saved", gameName: outcome.gameName });
      }
    });
  }

  function handleConfirm(gameName: string) {
    startSaving(async () => {
      const outcome = await saveGameResult(text, date);
      if (outcome.status === "saved") {
        setState({ status: "saved", gameName: outcome.gameName });
      } else if (outcome.status === "error") {
        setState({ status: "save-error", gameName, message: outcome.message });
      } else {
        // Passing a confirmedDate always resolves to saved/error — this is just a safe fallback.
        setState({ status: "save-error", gameName, message: "Something went wrong — try again." });
      }
    });
  }

  function handleCancel() {
    setDate("");
    setState({ status: "idle" });
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
          onChange={(event) => {
            setText(event.target.value);
            if (state.status === "confirming") setState({ status: "idle" });
          }}
          placeholder="Paste a result"
          rows={text.includes("\n") ? 6 : 1}
          disabled={state.status === "confirming"}
          className="min-h-[1.75rem] flex-1 resize-none bg-transparent font-mono text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none disabled:opacity-50"
        />
        {state.status !== "confirming" && (
          <button
            type="submit"
            disabled={isSaving || text.trim().length === 0}
            className="pt-0.5 font-mono text-xs uppercase tracking-wider text-yellow-400 disabled:text-stone-700"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        )}
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

      {state.status === "confirming" && (
        <div className="flex flex-col gap-2 rounded-lg bg-surface p-3">
          <p className="text-xs text-stone-500">{state.reason}</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => handleConfirm(state.gameName)}
              disabled={isSaving || date.trim().length === 0}
              className={primaryButtonClass}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={handleCancel} disabled={isSaving} className={quietButtonClass}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
