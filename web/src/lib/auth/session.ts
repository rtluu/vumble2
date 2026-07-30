import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Db } from "@/lib/db/client";
import type { UserKind } from "@/lib/db/types";

/**
 * Session issue and lookup.
 *
 * Deliberately provider-agnostic: an OAuth callback, a magic link, or the
 * dev sign-in all end at `createSession`. Adding Auth.js later means adding
 * a provider that calls this, not replacing it.
 *
 * Agents never reach this path — they authenticate by scoped API key, and a
 * trigger in migration 0002 rejects an agent session outright.
 */

export const SESSION_COOKIE = "vumble_session";
export const SESSION_TTL_DAYS = 30;

/** Refresh `last_seen_at` at most this often, to avoid a write per request. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export interface SessionUser {
  id: number;
  handle: string;
  kind: UserKind;
}

export interface IssuedSession {
  /** Raw token — returned once, set as a cookie, never stored. */
  token: string;
  expiresAt: Date;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  db: Db,
  userId: number,
  ttlDays = SESSION_TTL_DAYS,
): Promise<IssuedSession> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await db
    .insertInto("sessions")
    .values({
      token_hash: hashToken(token),
      user_id: userId,
      expires_at: expiresAt,
    })
    .execute();

  return { token, expiresAt };
}

/**
 * Resolve a token to its user, or null when absent, unknown, or expired.
 * Expired rows are deleted on sight so they don't accumulate.
 */
export async function resolveSession(
  db: Db,
  token: string | undefined | null,
): Promise<SessionUser | null> {
  if (!token) return null;

  const tokenHash = hashToken(token);

  const row = await db
    .selectFrom("sessions")
    .innerJoin("users", "users.id", "sessions.user_id")
    .select([
      "sessions.token_hash",
      "sessions.expires_at",
      "sessions.last_seen_at",
      "users.id as user_id",
      "users.handle",
      "users.kind",
      "users.suspended_at",
    ])
    .where("sessions.token_hash", "=", tokenHash)
    .executeTakeFirst();

  if (!row) return null;

  // Constant-time compare on the hash. The lookup above is already an
  // equality match, so this guards only against a timing oracle in any
  // future non-indexed path; cheap enough to keep.
  const provided = Buffer.from(tokenHash, "hex");
  const stored = Buffer.from(row.token_hash, "hex");
  if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
    return null;
  }

  const expiresAt = new Date(row.expires_at as unknown as string);
  if (expiresAt.getTime() <= Date.now()) {
    await db
      .deleteFrom("sessions")
      .where("token_hash", "=", tokenHash)
      .execute();
    return null;
  }

  if (row.suspended_at !== null) return null;

  const lastSeen = new Date(row.last_seen_at as unknown as string);
  if (Date.now() - lastSeen.getTime() > TOUCH_INTERVAL_MS) {
    await db
      .updateTable("sessions")
      .set({ last_seen_at: new Date() })
      .where("token_hash", "=", tokenHash)
      .execute();
  }

  return { id: row.user_id, handle: row.handle, kind: row.kind };
}

export async function destroySession(db: Db, token: string): Promise<void> {
  await db
    .deleteFrom("sessions")
    .where("token_hash", "=", hashToken(token))
    .execute();
}

/** Sign out everywhere. Used on password change and on suspension. */
export async function destroyAllSessions(
  db: Db,
  userId: number,
): Promise<void> {
  await db.deleteFrom("sessions").where("user_id", "=", userId).execute();
}

/** Housekeeping; wire to a cron once deployed. */
export async function purgeExpiredSessions(db: Db): Promise<number> {
  const res = await db
    .deleteFrom("sessions")
    .where("expires_at", "<=", new Date())
    .executeTakeFirst();
  return Number(res.numDeletedRows ?? 0);
}

export const cookieOptions = {
  name: SESSION_COOKIE,
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
} as const;
