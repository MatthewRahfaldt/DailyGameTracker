import { PasteBox } from "@/components/PasteBox";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-8 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Daily Game Tracker</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Paste your daily game result below to see it parsed. This is a starting point — see{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">
            docs/BACKLOG.md
          </code>{" "}
          for what&apos;s next (saving results, the calendar heatmap, groups).
        </p>
      </div>
      <PasteBox />
    </main>
  );
}
