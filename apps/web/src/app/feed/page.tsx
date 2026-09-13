import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FeedList } from "@/components/FeedList";
import { ShareFollowLink } from "@/components/ShareFollowLink";
import { getFeedView } from "@/lib/feed-view";
import { unfollow } from "@/lib/follow-actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Feed — Daily Game Tracker" };

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=%2Ffeed");

  const { following, items, isDemo } = await getFeedView(session.user.id);
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { followCode: true },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <Link href="/" className="text-sm text-black/60 underline dark:text-white/60">
          ← Back to paste box
        </Link>
        <h1 className="text-2xl font-semibold">Feed</h1>
        {isDemo && (
          <p
            role="status"
            className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
          >
            <strong>Showing sample data.</strong>
          </p>
        )}
      </header>

      {following.length === 0 ? (
        <section className="flex flex-col gap-4">
          <p className="text-sm">You aren&apos;t following anyone yet.</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Send someone your link so they can follow you, and ask for theirs.
          </p>
          {me && <ShareFollowLink code={me.followCode} />}
        </section>
      ) : (
        <>
          <FeedList items={items} />
          <section className="flex flex-col gap-2 border-t border-black/10 pt-6 dark:border-white/20">
            <h2 className="text-sm font-medium">Following ({following.length})</h2>
            <ul className="flex flex-col gap-1">
              {following.map((actor) => (
                <li key={actor.id} className="flex items-center justify-between gap-4 text-sm">
                  <Link href={`/u/${actor.id}`} className="underline">
                    {actor.name}
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await unfollow(actor.id);
                    }}
                  >
                    <button type="submit" className="text-black/50 underline dark:text-white/50">
                      Unfollow
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
          {me && <ShareFollowLink code={me.followCode} />}
        </>
      )}
    </main>
  );
}
