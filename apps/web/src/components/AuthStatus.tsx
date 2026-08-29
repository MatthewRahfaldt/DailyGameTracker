import { auth, signIn, signOut } from "@/auth";

/**
 * Server Component that shows a "Sign in with GitHub" button or the signed-in user + a sign-out
 * button. Uses inline Server Actions (the `"use server"` functions below) — no client-side JS or
 * API route needed for the buttons themselves.
 */
export async function AuthStatus() {
  const session = await auth();

  if (!session?.user) {
    return (
      <form
        action={async () => {
          "use server";
          await signIn("github");
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 dark:border-white/20"
        >
          Sign in with GitHub
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span>Signed in as {session.user.name ?? session.user.email}</span>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-black/10 px-3 py-1.5 font-medium transition-opacity hover:opacity-80 dark:border-white/20"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
