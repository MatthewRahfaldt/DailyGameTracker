import { signIn } from "@/auth";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/styles";

/** Signed-out home: GitHub, Google, or an email magic link. Server Actions only, no client JS. */
export function SignInPanel() {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-mono text-sm uppercase tracking-[0.12em] text-stone-100">
          Track your daily games
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Sign in to save results, follow friends and join groups.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <form
          action={async () => {
            "use server";
            await signIn("github");
          }}
        >
          <button type="submit" className={secondaryButtonClass}>
            GitHub
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button type="submit" className={secondaryButtonClass}>
            Google
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
        className="flex gap-2"
      >
        <input
          type="email"
          name="email"
          required
          aria-label="Email"
          placeholder="you@example.com"
          className={inputClass}
        />
        <button type="submit" className={`${primaryButtonClass} shrink-0`}>
          Email link
        </button>
      </form>
    </section>
  );
}
