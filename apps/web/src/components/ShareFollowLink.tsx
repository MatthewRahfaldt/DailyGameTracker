"use client";

import { useEffect, useState } from "react";

/** Your personal follow link, with a copy button. Anyone signed in who opens it can follow you. */
export function ShareFollowLink({ code }: { code: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const url = origin ? `${origin}/follow/${code}` : `/follow/${code}`;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Your follow link</h2>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-md border border-black/10 p-2 text-xs dark:border-white/20">
          {url}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-md border border-black/10 px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80 dark:border-white/20"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}
