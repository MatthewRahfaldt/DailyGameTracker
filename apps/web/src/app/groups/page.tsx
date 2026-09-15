import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JoinGroupForm } from "@/components/JoinGroupForm";
import { PasswordField } from "@/components/PasswordField";
import { Page } from "@/components/ui/Page";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { inputClass, primaryButtonClass } from "@/components/ui/styles";
import { prisma } from "@/lib/prisma";
import { createGroup } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Groups — Daily Game Tracker" };

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    include: { group: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <Page>
      {memberships.length === 0 ? (
        <p className="text-sm text-stone-500">You&apos;re not in any groups yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-900">
          {memberships.map(({ group }) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="flex items-baseline justify-between gap-4 py-3 transition-colors hover:text-stone-100"
              >
                <span className="text-sm text-stone-200">{group.name}</span>
                <span className="text-xs text-stone-500">
                  {group._count.members} member{group._count.members === 1 ? "" : "s"} ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <details open={memberships.length === 0}>
        <summary className="font-mono text-xs uppercase tracking-wider text-yellow-400">+ Create or join</summary>
        <div className="grid gap-8 pt-5 sm:grid-cols-2">
          <section className="flex flex-col gap-3">
            <SectionLabel>Create</SectionLabel>
            <form action={createGroup} className="flex flex-col gap-3">
              <input name="name" required aria-label="Group name" placeholder="Group name" className={inputClass} />
              <PasswordField name="password" placeholder="Password (optional)" />
              <button type="submit" className={`${primaryButtonClass} self-start`}>
                Create
              </button>
            </form>
          </section>
          <section className="flex flex-col gap-3">
            <SectionLabel>Join</SectionLabel>
            <JoinGroupForm />
          </section>
        </div>
      </details>
    </Page>
  );
}
