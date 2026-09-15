import Link from "next/link";
import { redirect } from "next/navigation";
import { dayLabel, groupByDay, todayUtc } from "@dgt/stats";
import { auth } from "@/auth";
import { CopyLink } from "@/components/ui/CopyLink";
import { Menu } from "@/components/ui/Menu";
import { Page } from "@/components/ui/Page";
import { CardGrid, ResultCard } from "@/components/ui/ResultCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { menuItemClass, sectionLabelClass } from "@/components/ui/styles";
import { getFeedView } from "@/lib/feed-view";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Feed — Daily Game Tracker" };

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=%2Ffeed");

  const { game } = await searchParams;
  const [{ following, items }, me] = await Promise.all([
    getFeedView(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { followCode: true } }),
  ]);

  if (following.length === 0) {
    return (
      <Page>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-stone-300">You aren&apos;t following anyone yet.</p>
          <p className="text-sm text-stone-500">
            Send someone your link so they can follow you, and ask for theirs.
          </p>
        </div>
        {me && <CopyLink label="Your follow link" path={`/follow/${me.followCode}`} />}
      </Page>
    );
  }

  const gameOptions = [...new Map(items.map((item) => [item.game.slug, item.game])).values()].sort(
    (a, b) => a.name.localeCompare(b.name),
  );
  // An unknown or repeated ?game= is ignored rather than showing an empty feed.
  const selected = typeof game === "string" ? gameOptions.find((option) => option.slug === game) : undefined;
  const visible = selected ? items.filter((item) => item.game.slug === selected.slug) : items;
  const today = todayUtc();

  return (
    <Page>
      <div className="flex justify-end">
        <Menu label={`${selected ? selected.name : "All games"} ▾`}>
          <Link href="/feed" className={menuItemClass}>
            All games
          </Link>
          {gameOptions.map((option) => (
            <Link
              key={option.slug}
              href={`/feed?game=${encodeURIComponent(option.slug)}`}
              className={menuItemClass}
            >
              {option.name}
            </Link>
          ))}
        </Menu>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-stone-500">
          Nothing in the last 30 days{selected ? ` for ${selected.name}` : ""}.
        </p>
      ) : (
        groupByDay(visible).map((day) => (
          <section key={day.date} className="flex flex-col gap-3">
            <SectionLabel>{dayLabel(day.date, today)}</SectionLabel>
            <CardGrid>
              {day.items.map((item) => (
                <ResultCard
                  key={item.id}
                  summary={item.summary}
                  who={
                    <Link href={`/u/${item.actor.id}`} className="font-medium text-stone-200 hover:underline">
                      {item.actor.name}
                    </Link>
                  }
                />
              ))}
            </CardGrid>
          </section>
        ))
      )}

      <details className="border-t border-stone-900 pt-4">
        <summary className={sectionLabelClass}>Following ({following.length})</summary>
        <div className="flex flex-col gap-6 pt-4">
          <ul className="flex flex-col divide-y divide-stone-900">
            {following.map((actor) => (
              <li key={actor.id}>
                <Link
                  href={`/u/${actor.id}`}
                  className="block py-2 text-sm text-stone-300 transition-colors hover:text-stone-100"
                >
                  {actor.name}
                </Link>
              </li>
            ))}
          </ul>
          {me && <CopyLink label="Your follow link" path={`/follow/${me.followCode}`} />}
        </div>
      </details>
    </Page>
  );
}
