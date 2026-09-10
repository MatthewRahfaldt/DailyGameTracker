import { auth, signIn, signOut } from "@/auth";

/**
 * Server Component that shows sign-in options (GitHub, Google, or an email magic link) or the
 * signed-in user + a sign-out button. Uses inline Server Actions (the `"use server"` functions
 * below) — no client-side JS or API route needed for any of this.
 */
export async function AuthStatus() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
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
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 dark:border-white/20"
            >
              Sign in with Google
            </button>
          </form>
        </div>
        <form
          action={async (formData: FormData) => {
            "use server";
            const email = formData.get("email");
            if (typeof email === "string" && email.length > 0) {
              await signIn("resend", { email, redirectTo: "/" });
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          />
          <button
            type="submit"
            className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 dark:border-white/20"
          >
            Email me a sign-in link
          </button>
        </form>
      </div>
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
