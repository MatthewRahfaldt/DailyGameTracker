import type { ReactNode } from "react";
import { sectionLabelClass } from "./styles";

export function SectionLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${sectionLabelClass}`}>
      <h2>{children}</h2>
      {aside && <span>{aside}</span>}
    </div>
  );
}
