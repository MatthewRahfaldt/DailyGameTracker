/**
 * A game's name, linked to its own website when one is configured (docs/BACKLOG.md — "Link
 * games to their websites"). Falls back to plain text when `url` is missing, so a game seeded
 * before this feature existed (or added later without a mapped URL in `prisma/seed.ts`) never
 * renders a broken or empty link.
 *
 * Shared across every place a game's name shows up as a clickable item: /games, the Today
 * checklist, the heatmap's day-detail panel, and the per-game stats table.
 */
export function GameLink({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | null;
  className?: string;
}) {
  if (!url) {
    return <span className={className}>{name}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={`underline decoration-black/30 underline-offset-2 transition-opacity hover:opacity-80 dark:decoration-white/30 ${className ?? ""}`}
    >
      {name}
    </a>
  );
}
