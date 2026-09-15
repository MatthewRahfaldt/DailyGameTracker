"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today", isActive: (path: string) => path === "/" },
  { href: "/feed", label: "Feed", isActive: (path: string) => path.startsWith("/feed") || path.startsWith("/follow") },
  { href: "/stats", label: "Stats", isActive: (path: string) => path.startsWith("/stats") || path.startsWith("/u/") },
  { href: "/groups", label: "Groups", isActive: (path: string) => path.startsWith("/groups") },
];

/** Tabs under the header on desktop; a fixed bottom bar on phones. */
export function NavTabs() {
  const pathname = usePathname() ?? "/";

  return (
    <>
      <nav
        aria-label="Main"
        className="mx-auto hidden w-full max-w-2xl gap-6 border-b border-stone-900 px-5 sm:flex"
      >
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 pb-2.5 pt-1 font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
                active
                  ? "border-yellow-400 text-stone-100"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-stone-900 bg-stone-950/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur sm:hidden"
      >
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`font-mono text-[10px] uppercase tracking-[0.1em] ${
                active ? "text-yellow-400" : "text-stone-500"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
