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
