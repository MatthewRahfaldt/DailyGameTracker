"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { joinGroupByCode } from "@/app/groups/actions";
import { inputClass, primaryButtonClass, sectionLabelClass } from "@/components/ui/styles";

/**
 * Join-a-group form (docs/BACKLOG.md, Milestone 5 — "Create/join group UI"). Used two ways:
 *  - with a fixed `code` (from /groups/join/[code], reached via a shared invite link) — only the
 *    password field shows, since the code is already known.
 *  - without one (from /groups, when someone was just handed a bare code) — a code field shows
 *    too.
 * `hasPassword` (only known on the fixed-code path) just changes the field's wording; the field
 * itself always renders, since a stranger following a bare code has no way to know in advance.
 */
export function JoinGroupForm({ code, hasPassword }: { code?: string; hasPassword?: boolean }) {
  const router = useRouter();
  const [codeInput, setCodeInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const resolvedCode = (code ?? codeInput).trim();
    if (!resolvedCode) {
      setError("Enter an invite code.");
      return;
    }

    startTransition(async () => {
      const outcome = await joinGroupByCode(resolvedCode, password);
      switch (outcome.status) {
        case "ok":
        case "already":
          router.push(`/groups/${outcome.groupId}`);
          return;
        case "not-found":
          setError("That invite code doesn't match any group.");
          return;
        case "wrong-password":
          setError("Wrong password.");
          return;
        case "error":
          setError(outcome.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {!code && (
        <div className="flex flex-col gap-1">
          <label htmlFor="join-code" className={sectionLabelClass}>
            Invite code
          </label>
          <input
            id="join-code"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder="Paste the code your friend sent you"
            className={inputClass}
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="join-password" className={sectionLabelClass}>
          Password{hasPassword === false ? " (not required)" : ""}
        </label>
        <input
          id="join-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={hasPassword ? "Required" : "Leave blank if none"}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className={`${primaryButtonClass} self-start`}
      >
        {isPending ? "Joining…" : "Join group"}
      </button>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
