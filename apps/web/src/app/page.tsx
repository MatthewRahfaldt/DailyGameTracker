import Link from "next/link";
import { formatShortDate } from "@dgt/stats";
import { auth } from "@/auth";
import { PasteBox } from "@/components/PasteBox";
import { SignInPanel } from "@/components/SignInPanel";
import { Page } from "@/components/ui/Page";
import { CardGrid, ResultCard, UnplayedCard } from "@/components/ui/ResultCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { getTodayView } from "@/lib/today-view";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <Page>
        <SignInPanel />
        <PasteBox />
      </Page>
    );
  }

  const today = await getTodayView(session.user.id);

  return (
    <Page>
      <PasteBox />
      {today &&
        (today.games.length === 0 ? (
          <p className="text-sm text-stone-500">
            You&apos;re not tracking any games yet.{" "}
            <Link href="/games" className="text-stone-300 underline underline-offset-4">
              Pick some
            </Link>{" "}
            or paste a result above.
          </p>
        ) : (
          <section className="flex flex-col gap-3">
            <SectionLabel
              aside={`${today.games.filter((entry) => entry.summary).length} / ${today.games.length}`}
            >
              {formatShortDate(today.date)}
            </SectionLabel>
            <CardGrid>
              {today.games.map(({ game, summary }) =>
                summary ? (
                  <ResultCard key={game.id} summary={summary} />
                ) : (
                  <UnplayedCard key={game.id} name={game.name} url={game.url} />
                ),
              )}
            </CardGrid>
          </section>
        ))}
    </Page>
  );
}
