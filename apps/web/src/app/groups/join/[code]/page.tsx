import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { JoinGroupForm } from "@/components/JoinGroupForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Join a group — Daily Game Tracker" };

/** Landing page for a shared group invite link (see ShareGroupLink) — mirrors /follow/[code]. */
export default async function JoinGroupByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=%2Fgroups%2Fjoin%2F${code}`);
  }

  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    include: { _count: { select: { members: true } } },
  });

  if (!group) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-6 py-16">
        <Link href="/groups" className="text-sm text-black/60 underline dark:text-white/60">
          ← Back to groups
        </Link>
        <p className="text-sm">
          This invite link isn&apos;t valid — the group may have been deleted, or the link was
          mistyped.
        </p>
      </main>
    );
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  });
  if (existing) redirect(`/groups/${group.id}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-16">
      <Link href="/groups" className="text-sm text-black/60 underline dark:text-white/60">
        ← Back to groups
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Join {group.name}</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {group._count.members} member{group._count.members === 1 ? "" : "s"}
        </p>
      </div>
      <JoinGroupForm code={code} hasPassword={group.passwordHash != null} />
    </main>
  );
}
