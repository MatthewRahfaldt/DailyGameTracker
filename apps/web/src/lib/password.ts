import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Group join-password hashing (docs/BACKLOG.md, Milestone 5 — "Group create/join with optional
 * password"). Uses Node's built-in `crypto.scrypt` rather than adding a dependency (bcrypt/argon2)
 * for what's a low-stakes, friend-group password, not an account credential.
 *
 * Stored as `"<saltHex>:<hashHex>"` in `Group.passwordHash` — a single string column, no separate
 * salt column to keep in sync.
 */

const KEY_LENGTH = 64;

/** Hash a new group password for storage. Never store the plaintext anywhere. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Check a candidate password against a hash produced by `hashPassword`.
 * Uses a constant-time comparison so response timing can't leak how much of the password matched.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
