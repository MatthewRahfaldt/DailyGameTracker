import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateProfile } from "./actions";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    redirect("/");
  }

  // Node's Intl gives us the full IANA timezone list for free — no hardcoded list to maintain.
  const timezones = Intl.supportedValuesOf("timeZone");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-16">
      <Link
        href="/"
        className="self-start text-sm text-black/60 transition-opacity hover:opacity-80 dark:text-white/60"
      >
        ← Back to home
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Your timezone decides which calendar day a pasted result counts toward once results are
          saved (see docs/BACKLOG.md).
        </p>
      </div>

      <form action={updateProfile} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={user.name ?? ""}
            placeholder="Your name"
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="timezone" className="text-sm font-medium">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={user.timezone}
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Save
        </button>
      </form>

      <p className="text-sm text-black/60 dark:text-white/60">Signed in as {user.email}</p>
    </main>
  );
}
