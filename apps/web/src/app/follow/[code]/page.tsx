import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { followByCode } from "@/lib/follow-actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Follow — Daily Game Tracker" };

export default async function FollowPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { code } = await params;
  const { done } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/follow/${code}`)}`);
  }

  const target = await prisma.user.findUnique({
    where: { followCode: code },
    select: { id: true, name: true, image: true },
  });

  const shell = (children: React.ReactNode) => (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      {children}
      <Link href="/feed" className="text-sm text-black/60 underline dark:text-white/60">
        Go to your feed
      </Link>
    </main>
  );

  if (!target) {
    return shell(
      <p className="text-sm">
        <strong>This follow link isn&apos;t valid.</strong> Ask for a fresh one.
      </p>,
    );
  }

  if (target.id === session.user.id) {
    return shell(<p className="text-sm">That&apos;s your own follow link — share it with someone else.</p>);
  }

  // `done` is a URL query param — a crafted `?done=ok` link must never be trusted to mean the
  // Follow relationship exists. Re-derive that from the database; `done` only ever picks the
  // wording (freshly-followed vs. already-following) for a state the DB has confirmed is real.
  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: session.user.id, followingId: target.id },
    },
    select: { followerId: true },
  });

  if (existing) {
    return shell(
      done === "ok" ? (
        <p className="text-sm">
          You now follow <strong>{target.name ?? "this person"}</strong>.
        </p>
      ) : (
        <p className="text-sm">You already follow {target.name ?? "this person"}.</p>
      ),
    );
  }

  return shell(
    <>
      <h1 className="text-xl font-semibold">Follow {target.name ?? "this person"}?</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        You&apos;ll see their daily game results in your feed.
      </p>
      <form
        action={async () => {
          "use server";
          const outcome = await followByCode(code);
          redirect(`/follow/${code}?done=${outcome.status}`);
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 dark:border-white/20"
        >
          Follow
        </button>
      </form>
    </>,
  );
}
