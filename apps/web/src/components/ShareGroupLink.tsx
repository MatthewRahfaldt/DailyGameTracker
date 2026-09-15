"use client";

import { useEffect, useState } from "react";

/** A group's invite link, with a copy button — same pattern as ShareFollowLink. */
export function ShareGroupLink({ code }: { code: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeoutId);
  }, [copied]);

  const url = origin ? `${origin}/groups/join/${code}` : `/groups/join/${code}`;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Invite link</h2>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-md border border-black/10 p-2 text-xs dark:border-white/20">
          {url}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          }}
          className="rounded-md border border-black/10 px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80 dark:border-white/20"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}
