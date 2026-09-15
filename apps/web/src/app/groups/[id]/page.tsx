import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { dayLabel, groupByDay, todayUtc } from "@dgt/stats";
import { auth } from "@/auth";
import { GroupManage } from "@/components/groups/GroupManage";
import { Reactions } from "@/components/groups/Reactions";
import { JoinGroupForm } from "@/components/JoinGroupForm";
import { Menu } from "@/components/ui/Menu";
import { Page } from "@/components/ui/Page";
import { CardGrid, ResultCard } from "@/components/ui/ResultCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { menuItemClass, sectionLabelClass } from "@/components/ui/styles";
import { getGroupView } from "@/lib/group-view";
import { prisma } from "@/lib/prisma";
import { toGame } from "@/lib/result-rows";

export const dynamic = "force-dynamic";

/**
 * One group: standings and feed for the selected game (?game=<slug>, defaulting to the first
 * assigned game), with invite/roster/games/password behind "Invite & manage". Non-members only
 * see the name, member count and a join form — getGroupView never loads results for them.
 */
export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ game?: string | string[] }>;
}) {
  const { id } = await params;
  const { game: gameParam } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=%2Fgroups%2F${id}`);
  }

  const group = await getGroupView(id, session.user.id);
  if (!group) notFound();

  if (group.viewerRole === null) {
    return (
      <Page title={group.name}>
        <p className="text-sm text-stone-500">
          {group.members.length} member{group.members.length === 1 ? "" : "s"} ·{" "}
          {group.hasPassword ? "password required" : "open to join"}
        </p>
        <JoinGroupForm code={group.inviteCode} hasPassword={group.hasPassword} />
      </Page>
    );
  }

  const canManageGames = group.viewerRole === "owner" || group.viewerRole === "admin";
  const assignedIds = new Set(group.games.map((game) => game.id));
  const assignableGames = canManageGames
    ? (await prisma.game.findMany({ orderBy: { name: "asc" } }))
        .filter((game) => !assignedIds.has(game.id))
        .map(toGame)
    : [];

  const selected = group.standings.find((entry) => entry.game.slug === gameParam) ?? group.standings[0];
  const feed = selected ? group.feed.filter((item) => item.game.id === selected.game.id) : [];
  const today = todayUtc();

  return (
    <Page
      title={group.name}
      action={
        selected && group.games.length > 1 ? (
          <Menu label={`${selected.game.name} ▾`}>
            {group.games.map((game) => (
              <Link
                key={game.id}
                href={`/groups/${group.id}?game=${encodeURIComponent(game.slug)}`}
                className={menuItemClass}
              >
                {game.name}
              </Link>
            ))}
          </Menu>
        ) : undefined
      }
    >
      {selected ? (
        <>
          <section className="flex flex-col gap-2">
            <SectionLabel aside={selected.game.name}>Standings</SectionLabel>
            {selected.standings.length === 0 ? (
              <p className="text-sm text-stone-500">Nobody&apos;s played {selected.game.name} yet.</p>
            ) : (
              <ol className="flex flex-col divide-y divide-stone-900">
                {selected.standings.map((row, index) => {
                  const isMe = row.actor.id === group.viewerId;
                  return (
                    <li
                      key={row.actor.id}
                      className={`flex items-baseline justify-between gap-4 py-2.5 text-sm ${
                        isMe ? "text-yellow-400" : "text-stone-200"
                      }`}
                    >
                      <span>
                        <span className="inline-block w-6 font-mono text-stone-600">{index + 1}</span>
                        {isMe ? "You" : row.actor.name}
                      </span>
                      <span className={`font-mono ${isMe ? "text-yellow-400" : "text-green-400"}`}>
                        {row.view.line}
                        {row.view.currentStreak > 0 && (
                          <span className="text-stone-500"> · {row.view.currentStreak}🔥</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {groupByDay(feed).map((day) => (
            <section key={day.date} className="flex flex-col gap-3">
              <SectionLabel>{dayLabel(day.date, today)}</SectionLabel>
              <CardGrid>
                {day.items.map((item) => (
                  <ResultCard
                    key={item.id}
                    summary={item.summary}
                    who={item.actor.id === group.viewerId ? "You" : item.actor.name}
                    footer={<Reactions groupId={group.id} resultId={item.id} reactions={item.reactions} />}
                  />
                ))}
              </CardGrid>
            </section>
          ))}
        </>
      ) : (
        <p className="text-sm text-stone-500">
          No games assigned yet.{canManageGames ? " Add one under Invite & manage." : ""}
        </p>
      )}

      <details className="border-t border-stone-900 pt-4">
        <summary className={sectionLabelClass}>⋯ Invite &amp; manage</summary>
        <div className="pt-4">
          <GroupManage group={group} assignableGames={assignableGames} />
        </div>
      </details>
    </Page>
  );
}
