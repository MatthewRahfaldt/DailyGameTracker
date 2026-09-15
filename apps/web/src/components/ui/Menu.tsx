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
