import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

/**
 * Auth.js v5 config. We deliberately don't use the Prisma *adapter* (which would need
 * Account/Session/VerificationToken tables) — sessions are plain JWTs, and the callbacks below
 * just keep our own `User` table (prisma/schema.prisma) in sync by email. Simpler schema, same
 * end result: `session.user.id` is our own User.id everywhere else in the app.
 *
 * Reads AUTH_GITHUB_ID / AUTH_GITHUB_SECRET / AUTH_SECRET from the environment automatically —
 * see .env.example and docs/BACKLOG.md's "Register GitHub OAuth App" step.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      await prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name ?? undefined },
        create: { email: user.email, name: user.name ?? undefined },
      });

      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
        if (dbUser) {
          token.userId = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
