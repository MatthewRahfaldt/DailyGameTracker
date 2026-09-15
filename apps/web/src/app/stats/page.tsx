import Link from "next/link";
import { StatsView } from "@/components/stats/StatsView";
import { Page } from "@/components/ui/Page";
import { getMyStats } from "@/lib/demo-data";

// Depends on the session and today's date — never freeze it at build time.
export const dynamic = "force-dynamic";

export const metadata = { title: "Stats — Daily Game Tracker" };

export default async function StatsPage() {
  const { view, isDemo } = await getMyStats();

  return (
    <Page>
      {isDemo && (
        <p role="status" className="text-sm text-stone-500">
          Sample data —{" "}
          <Link href="/" className="text-stone-300 underline underline-offset-4">
            sign in
          </Link>{" "}
          to track your own.
        </p>
      )}
      <StatsView view={view} />
    </Page>
  );
}
