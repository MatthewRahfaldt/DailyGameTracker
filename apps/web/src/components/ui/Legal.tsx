import type { ReactNode } from "react";
import { sectionLabelClass } from "./styles";

/** Heading + prose block used by the privacy policy and terms pages. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 text-sm leading-relaxed text-stone-400">
      <h2 className={sectionLabelClass}>{title}</h2>
      {children}
    </section>
  );
}

/** Bulleted list styled to match the surrounding legal prose. */
export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-stone-600">{children}</ul>;
}
