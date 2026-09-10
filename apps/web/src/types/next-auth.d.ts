import { DefaultSession } from "next-auth";

// Module augmentation so `session.user.id` type-checks. See src/auth.ts's `session` callback,
// which sets it from the adapter's User record (database session strategy).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
