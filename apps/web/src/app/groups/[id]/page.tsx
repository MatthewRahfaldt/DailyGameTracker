import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getGroupView } from "@/lib/group-view";
import { DeleteGroupButton } from "@/components/DeleteGroupButton";
import { GameLink } from "@/components/GameLink";
import { GroupFeedList } from "@/components/GroupFeedList";
import { JoinGroupForm } from "@/components/JoinGroupForm";
import { PasswordField } from "@/components/PasswordField";
import { ShareGroupLink } from "@/components/ShareGroupLink";
import {
  assignGameToGroup,
  deleteGroup,
  leaveGroup,
  removeGameFromGroup,
  resetGroupPassword,
  updateMemberRole,
} from "../actions";

export const dynamic = "force-dynamic";

/**
 * A single group's page (docs/BACKLOG.md, Milestone 5 — "Group dashboard & shared stats"):
 * roster + role management, admin-gated game assignment, per-game standings, and a feed with
 * emoji reactions. Non-members only ever see the name/member count and a join form — getGroupView
 * doesn't even load results for them.
 */
export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=%2Fgroups%2F${id}`);
  }

  const group = await getGroupView(id, session.user.id);
  if (!group) notFound();

  const isMember = group.viewerRole != null;
  const canManageGames = group.viewerRole === "owner" || group.viewerRole === "admin";
  const isOwner = group.viewerRole === "owner";

  if (!isMember) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-16">
        <Link href="/groups" className="text-sm text-black/60 underline dark:text-white/60">
          ← Back to groups
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {group.members.length} member{group.members.length === 1 ? "" : "s"} ·{" "}
            {group.hasPassword ? "password required to join" : "open to join"}
          </p>
        </div>
        <JoinGroupForm code={group.inviteCode} hasPassword={group.hasPassword} />
      </main>
    );
  }

  const assignedIds = new Set(group.games.map((game) => game.id));
  const assignableGames = canManageGames
    ? (await prisma.game.findMany({ orderBy: { name: "asc" } })).filter(
        (game) => !assignedIds.has(game.id),
      )
    : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <Link href="/groups" className="text-sm text-black/60 underline dark:text-white/60">
        ← Back to groups
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <ShareGroupLink code={group.inviteCode} />
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Members ({group.members.length})</h2>
        <ul className="flex flex-col rounded-md border border-black/10 dark:border-white/15">
          {group.members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 border-b border-black/5 p-3 text-sm last:border-0 dark:border-white/10"
            >
              <span>{member.name}</span>
              {isOwner && member.role !== "owner" ? (
                <form action={updateMemberRole} className="flex items-center gap-2">
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="userId" value={member.id} />
                  <input
                    type="hidden"
                    name="role"
                    value={member.role === "admin" ? "member" : "admin"}
                  />
                  <button type="submit" className="text-xs text-black/50 underline dark:text-white/50">
                    {member.role === "admin" ? "Demote to member" : "Promote to admin"}
                  </button>
                </form>
              ) : (
                <span className="text-xs text-black/50 dark:text-white/50">{member.role}</span>
              )}
            </li>
          ))}
        </ul>
        {!isOwner && (
          <form action={leaveGroup} className="self-start">
            <input type="hidden" name="groupId" value={group.id} />
            <button type="submit" className="text-xs text-black/50 underline dark:text-white/50">
              Leave group
            </button>
          </form>
        )}
      </section>

      {isOwner && (
        <section className="flex flex-col gap-2 rounded-md border border-black/10 p-4 dark:border-white/20">
          <h2 className="text-sm font-medium">
            {group.hasPassword ? "Change or remove password" : "Set a join password"}
          </h2>
          <form action={resetGroupPassword} className="flex items-center gap-2">
            <input type="hidden" name="groupId" value={group.id} />
            <PasswordField
              name="password"
              placeholder="New password (blank = no password)"
              className="flex-1"
            />
            <button
              type="submit"
              className="rounded-md border border-black/10 px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80 dark:border-white/20"
            >
              Save
            </button>
          </form>
        </section>
      )}

      {isOwner && (
        <section className="flex flex-col gap-2 rounded-md border border-red-600/30 p-4 dark:border-red-400/30">
          <h2 className="text-sm font-medium">Danger zone</h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            Deletes the group for everyone — members, assigned games, and the feed. Nobody&apos;s
            personal game history is affected.
          </p>
          <form action={deleteGroup}>
            <input type="hidden" name="groupId" value={group.id} />
            <DeleteGroupButton groupName={group.name} />
          </form>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Assigned games ({group.games.length})</h2>
        {group.games.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            No games assigned yet. {canManageGames ? "Add one below." : "Ask an admin to add one."}
          </p>
        ) : (
          <ul className="flex flex-col rounded-md border border-black/10 dark:border-white/15">
            {group.games.map((game) => (
              <li
                key={game.id}
                className="flex items-center justify-between gap-3 border-b border-black/5 p-3 text-sm last:border-0 dark:border-white/10"
              >
                <GameLink name={game.name} url={game.url} />
                {canManageGames && (
                  <form action={removeGameFromGroup}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="gameId" value={game.id} />
                    <button
                      type="submit"
                      className="text-xs text-black/50 underline dark:text-white/50"
                    >
                      Remove
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {canManageGames && assignableGames.length > 0 && (
          <form action={assignGameToGroup} className="flex items-center gap-2">
            <input type="hidden" name="groupId" value={group.id} />
            <select
              name="gameId"
              required
              className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            >
              {assignableGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Assign
            </button>
          </form>
        )}
      </section>

      {group.standings.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium">Standings</h2>
          {group.standings.map(({ game, standings }) => (
            <div
              key={game.id}
              className="overflow-x-auto rounded-md border border-black/10 dark:border-white/15"
            >
              <table className="w-full min-w-[420px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                  <tr className="border-b border-black/10 dark:border-white/15">
                    <th className="p-3 font-medium" colSpan={2}>
                      <GameLink name={game.name} url={game.url} />
                    </th>
                    <th className="p-3 font-medium">Streak</th>
                    <th className="p-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.length === 0 ? (
                    <tr>
                      <td className="p-3 text-black/50 dark:text-white/50" colSpan={4}>
                        Nobody&apos;s played this yet.
                      </td>
                    </tr>
                  ) : (
                    standings.map((row, index) => (
                      <tr
                        key={row.actor.id}
                        className="border-b border-black/5 last:border-0 dark:border-white/10"
                      >
                        <td className="p-3 tabular-nums text-black/50 dark:text-white/50">
                          {index + 1}
                        </td>
                        <td className="p-3 font-medium">{row.actor.name}</td>
                        <td className="p-3 tabular-nums">
                          {row.view.currentStreak > 0 ? `${row.view.currentStreak} 🔥` : "—"}
                        </td>
                        <td className="p-3 tabular-nums">{row.view.line}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Feed</h2>
        <GroupFeedList groupId={group.id} items={group.feed} />
      </section>
    </main>
  );
}
