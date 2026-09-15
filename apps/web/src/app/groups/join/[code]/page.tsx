import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JoinGroupForm } from "@/components/JoinGroupForm";
import { Page } from "@/components/ui/Page";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Join a group — Daily Game Tracker" };

/** Landing page for a shared group invite link — mirrors /follow/[code]. */
export default async function JoinGroupByCodePage({ params }: { params: Promise<{ code: string }> }) {
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
      <Page>
        <p className="text-sm text-stone-300">
          This invite link isn&apos;t valid — the group may have been deleted, or the link was mistyped.
        </p>
      </Page>
    );
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  });
  if (existing) redirect(`/groups/${group.id}`);

  return (
    <Page title={`Join ${group.name}`}>
      <p className="text-sm text-stone-500">
        {group._count.members} member{group._count.members === 1 ? "" : "s"}
      </p>
      <JoinGroupForm code={code} hasPassword={group.passwordHash != null} />
    </Page>
  );
}
