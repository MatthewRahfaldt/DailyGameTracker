import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { JoinGroupForm } from "@/components/JoinGroupForm";
import { PasswordField } from "@/components/PasswordField";
import { createGroup } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Groups — Daily Game Tracker" };

/**
 * Groups home (docs/BACKLOG.md, Milestone 5 — "Create/join group UI"): the groups you're in, plus
 * forms to create a new one or join an existing one by invite code.
 */
export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    include: { group: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <Link href="/" className="text-sm text-black/60 underline dark:text-white/60">
        ← Back to home
      </Link>
      <h1 className="text-2xl font-semibold">Groups</h1>

      {memberships.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          You&apos;re not in any groups yet — create one or join a friend&apos;s below.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {memberships.map(({ group, role }) => (
            <li
              key={group.id}
              className="flex items-center justify-between gap-3 rounded-md border border-black/10 p-3 text-sm dark:border-white/20"
            >
              <Link href={`/groups/${group.id}`} className="font-medium underline">
                {group.name}
              </Link>
              <span className="text-xs text-black/50 dark:text-white/50">
                {group._count.members} member{group._count.members === 1 ? "" : "s"} · {role}
              </span>
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-3 rounded-md border border-black/10 p-4 dark:border-white/20">
        <h2 className="text-sm font-medium">Create a group</h2>
        <p className="text-xs text-black/50 dark:text-white/50">
          To change an existing group&apos;s password later, use its own page instead of this form
          — but if you do reuse this with a name you already own, it updates that group rather than
          making a duplicate.
        </p>
        <form action={createGroup} className="flex flex-col gap-3">
          <input
            name="name"
            required
            placeholder="Group name"
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          />
          <PasswordField name="password" placeholder="Password (optional — leave blank for open join)" />
          <button
            type="submit"
            className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Create group
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-black/10 p-4 dark:border-white/20">
        <h2 className="text-sm font-medium">Join a group</h2>
        <JoinGroupForm />
      </section>
    </main>
  );
}
