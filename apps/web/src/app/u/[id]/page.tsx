import { notFound, redirect } from "next/navigation";
import { canViewProfile, todayUtc } from "@dgt/stats";
import { auth } from "@/auth";
import { StatsView } from "@/components/stats/StatsView";
import { Page } from "@/components/ui/Page";
import { quietButtonClass } from "@/components/ui/styles";
import { unfollow } from "@/lib/follow-actions";
import { prisma } from "@/lib/prisma";
import { loadStatsInputs } from "@/lib/stats-queries";
import { buildStatsPageView } from "@/lib/stats-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/u/${id}`)}`);
  }
  const viewerId = session.user.id;

  const follows = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const followingIds = follows.map((follow) => follow.followingId);

  // 404 rather than 403: don't confirm whether this id exists to someone who can't see it.
  if (!canViewProfile(viewerId, id, followingIds)) notFound();

  const person = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!person) notFound();

  const today = todayUtc();
  const { games, results } = await loadStatsInputs(id, today);

  return (
    <Page
      title={person.name ?? "Player"}
      action={
        id !== viewerId && followingIds.includes(id) ? (
          <form
            action={async () => {
              "use server";
              await unfollow(id);
              redirect("/feed");
            }}
          >
            <button type="submit" className={quietButtonClass}>
              Unfollow
            </button>
          </form>
        ) : undefined
      }
    >
      <StatsView view={buildStatsPageView(results, games, today)} />
    </Page>
  );
}
