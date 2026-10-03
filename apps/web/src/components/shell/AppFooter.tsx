import Link from "next/link";

/** Legal links, shown at the bottom of every page (Google's OAuth review expects these on the homepage). */
export function AppFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-2xl gap-5 px-5 pb-24 font-mono text-[10px] uppercase tracking-[0.1em] text-stone-600 sm:pb-8">
      <Link href="/privacy" className="transition-colors hover:text-stone-300">
        Privacy
      </Link>
      <Link href="/terms" className="transition-colors hover:text-stone-300">
        Terms
      </Link>
    </footer>
  );
}
