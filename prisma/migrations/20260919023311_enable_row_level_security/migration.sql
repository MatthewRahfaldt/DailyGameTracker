-- Enable Row Level Security on every table, with no policies attached.
--
-- Why: Supabase exposes every table in the `public` schema through its auto-generated REST
-- (PostgREST) and GraphQL APIs by default, reachable from anywhere with just the project's URL
-- and its public "anon" key. That's completely independent of this app's own code — this app
-- never calls those APIs, since apps/web talks to Postgres directly through Prisma
-- (DATABASE_URL/DIRECT_URL) — but the APIs still exist and, without RLS, will happily read or
-- write raw rows (including User.email, Session tokens, everyone's GameResult history, ...) to
-- anyone holding the anon key, which is not a secret and should be assumed discoverable.
--
-- Turning RLS on with zero policies makes every one of these tables deny-by-default for the
-- `anon`/`authenticated` roles PostgREST uses, closing that door entirely. It does not affect
-- this app: the Postgres role in DATABASE_URL/DIRECT_URL is Supabase's default `postgres` role,
-- which has BYPASSRLS, so every Prisma query this app already makes keeps working exactly as
-- before. (This is also why the migration is safe to run against the plain, non-Supabase Postgres
-- container CI tests against — ENABLE ROW LEVEL SECURITY is standard Postgres, and CI's own
-- connection there is that database's owner/superuser, so it bypasses RLS the same way.)
--
-- Deliberately NOT included: auth.uid()-based per-row policies (e.g. "a user may only see their
-- own GameResult rows"). Those presuppose Supabase Auth issuing the JWT that sets auth.uid() —
-- this app doesn't use Supabase Auth at all; sign-in is Auth.js (GitHub/Google/Resend) with its
-- own database-backed Session table, unrelated to Supabase's auth.users. There is no auth.uid()
-- here to write a meaningful policy against, so all authorization for this app continues to live
-- where it already did: the auth()/requireRole() checks in apps/web's Server Actions. If a real
-- Supabase Auth integration is ever added on top of this, per-row policies become meaningful and
-- can be layered on top of this migration then.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Game" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserGame" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Follow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Group" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupGame" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reaction" ENABLE ROW LEVEL SECURITY;
