import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * Auth.js v5 config, backed by the Prisma adapter (Account/Session/VerificationToken tables —
 * see prisma/schema.prisma) instead of the JWT-only + manual-upsert setup this started as.
 *
 * Why the switch: the email ("magic link") sign-in below needs somewhere durable to store
 * one-time verification tokens, and only a database adapter provides that. Once we have it,
 * GitHub/Google ride on the same database-backed sessions for free — one consistent auth model
 * instead of juggling two. The adapter also takes over user creation/linking-by-email, so the
 * manual upsert this file used to do in a `signIn` callback isn't needed anymore.
 *
 * Env vars (see .env.example): AUTH_SECRET, AUTH_GITHUB_ID/SECRET, AUTH_GOOGLE_ID/SECRET,
 * AUTH_RESEND_KEY, AUTH_EMAIL_FROM. All but AUTH_EMAIL_FROM are picked up automatically by
 * Auth.js's naming convention; AUTH_EMAIL_FROM is read explicitly below since there's no
 * sensible default "from" address to infer.
 *
 * Caveat worth knowing (see docs/BACKLOG.md): Resend's free tier can only send email sign-in
 * links to the address your Resend account itself was created with, unless you verify a real
 * sending domain. Fine for one person to try locally; your teammates will need their own Resend
 * setup (or a shared verified domain) before magic-link sign-in works for them too.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    GitHub,
    Google,
    Resend({
      from: process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev",
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
