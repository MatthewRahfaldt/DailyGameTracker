"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui/styles";

/**
 * A password `<input>` with a show/hide toggle. Uncontrolled (reads via `name` on form submit),
 * so it drops straight into any existing `<form action={...}>` in place of a plain `<input
 * type="password">` — see /groups/[id]'s "Change or remove password" section and /groups' "Create
 * a group" form.
 *
 * This can only ever reveal what the viewer is currently typing — it has no `defaultValue` for an
 * existing password, and never will. A group's password is stored as a salted scrypt hash
 * (apps/web/src/lib/password.ts); that's one-way by design, so there's no plaintext anywhere,
 * including on the server, to pre-fill this field with. The "Change or remove password" section's
 * heading already says whether a password is currently set — that's the honest version of "can
 * you show me the current password."
 */
export function PasswordField({
  name,
  placeholder,
  className,
}: {
  name: string;
  placeholder?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        className={`${inputClass} pr-14`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-wider text-stone-500 hover:text-stone-300"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
