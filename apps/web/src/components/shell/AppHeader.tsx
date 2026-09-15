import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Menu } from "@/components/ui/Menu";
import { menuItemClass } from "@/components/ui/styles";
import { NavTabs } from "./NavTabs";

function initialsFor(name?: string | null, email?: string | null): string {
  const source = (name ?? email ?? "?").trim();
  const words = source.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);
  return letters.toUpperCase();
}

/** Logo, account menu and tabs — shared by every page via the root layout. */
export async function AppHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 bg-stone-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 pb-3 pt-4">
        <Link href="/" className="font-mono text-xs tracking-[0.12em] text-yellow-400">
          DAILY//GAMES
        </Link>
        {session?.user ? (
          <Menu
            label={initialsFor(session.user.name, session.user.email)}
            ariaLabel="Account menu"
            summaryClassName="grid h-7 w-7 place-items-center rounded-full bg-stone-800 font-mono text-[10px] text-stone-300 transition-colors hover:bg-stone-700"
          >
            <Link href="/games" className={menuItemClass}>
              My games
            </Link>
            <Link href="/profile" className={menuItemClass}>
              Profile
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className={`${menuItemClass} w-full`}>
                Sign out
              </button>
            </form>
          </Menu>
        ) : (
          <Link
            href="/api/auth/signin"
            className="font-mono text-xs uppercase tracking-wider text-stone-400 transition-colors hover:text-stone-200"
          >
            Sign in
          </Link>
        )}
      </div>
      <NavTabs />
    </header>
  );
}
