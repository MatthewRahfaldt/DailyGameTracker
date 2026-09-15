import type { ReactNode } from "react";
import type { ResultSummary } from "@dgt/stats";

const VALUE_COLOR: Record<ResultSummary["outcome"], string> = {
  win: "text-green-400",
  score: "text-green-400",
  loss: "text-red-400",
};

const LABEL_CLASS = "font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500";

/** One game result: label, one big number, the share grid. Renders any game's ResultSummary. */
export function ResultCard({
  summary,
  who,
  footer,
}: {
  summary: ResultSummary;
  who?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-1 rounded-lg bg-surface p-3">
      {who && <div className="text-xs text-stone-400">{who}</div>}
      <p className={LABEL_CLASS}>{summary.label}</p>
      <p className={`font-mono text-2xl font-bold ${VALUE_COLOR[summary.outcome]}`}>
        {summary.value}
        {summary.suffix && (
          <span className="text-xs font-normal text-stone-600">{summary.suffix}</span>
        )}
      </p>
      {summary.grid.length > 0 && (
        <div aria-hidden className="text-[11px] leading-tight tracking-[-0.05em]">
          {summary.grid.map((row, index) => (
            <div key={index}>{row}</div>
          ))}
        </div>
      )}
      {footer && <div className="pt-2">{footer}</div>}
    </article>
  );
}

/** A tracked game with no result today. */
export function UnplayedCard({ name, url }: { name: string; url?: string | null }) {
  return (
    <article className="flex flex-col gap-1 rounded-lg p-3 outline-dashed outline-1 outline-stone-800">
      <p className={LABEL_CLASS}>{name}</p>
      <p className="font-mono text-2xl font-bold text-stone-700">—</p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-xs text-stone-400 transition-colors hover:text-stone-200"
        >
          Play ↗
        </a>
      ) : (
        <span className="text-xs text-stone-600">Not played yet</span>
      )}
    </article>
  );
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>;
}
