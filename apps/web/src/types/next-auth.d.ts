import { DefaultSession } from "next-auth";

// Module augmentation so `session.user.id` and `token.userId` type-check.
// See src/auth.ts — these are set in the `session`/`jwt` callbacks.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}
