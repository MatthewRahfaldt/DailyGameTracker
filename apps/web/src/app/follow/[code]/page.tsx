import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Page } from "@/components/ui/Page";
import { primaryButtonClass, quietButtonClass } from "@/components/ui/styles";
import { followByCode } from "@/lib/follow-actions";
import { prisma } from "@/lib/prisma";

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
    select: { id: true, name: true },
  });

  const shell = (children: React.ReactNode) => (
    <Page>
      <div className="flex flex-col items-start gap-4">{children}</div>
      <Link href="/feed" className={quietButtonClass}>
        Go to your feed
      </Link>
    </Page>
  );

  if (!target) {
    return shell(<p className="text-sm text-stone-300">This follow link isn&apos;t valid. Ask for a fresh one.</p>);
  }

  if (target.id === session.user.id) {
    return shell(<p className="text-sm text-stone-300">That&apos;s your own follow link — share it with someone else.</p>);
  }

  // `done` only picks the wording; whether the follow exists always comes from the database.
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
    select: { followerId: true },
  });

  const name = target.name ?? "this person";

  if (existing) {
    return shell(
      <p className="text-sm text-stone-300">
        {done === "ok" ? `You now follow ${name}.` : `You already follow ${name}.`}
      </p>,
    );
  }

  return shell(
    <>
      <h1 className="font-mono text-sm uppercase tracking-[0.12em] text-stone-100">Follow {name}?</h1>
      <p className="text-sm text-stone-500">You&apos;ll see their daily game results in your feed.</p>
      <form
        action={async () => {
          "use server";
          const outcome = await followByCode(code);
          redirect(`/follow/${code}?done=${outcome.status}`);
        }}
      >
        <button type="submit" className={primaryButtonClass}>
          Follow
        </button>
      </form>
    </>,
  );
}
