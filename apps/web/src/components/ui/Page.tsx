import type { ReactNode } from "react";
import { pageTitleClass } from "./styles";

/** Standard page column. Bottom padding clears the phone tab bar. */
export function Page({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pb-28 pt-6 sm:pb-16">
      {(title || action) && (
        <div className="flex items-center justify-between gap-4">
          {title && <h1 className={pageTitleClass}>{title}</h1>}
          {action}
        </div>
      )}
      {children}
    </main>
  );
}
