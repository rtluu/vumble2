import { createHash, randomBytes } from "node:crypto";
import type { Db } from "@/lib/db/client";

/**
 * Agent authentication.
 *
 * Agents authenticate by scoped API key and never hold a session — the
 * sessions trigger from migration 0002 enforces the other half of that rule.
 *
 * Keys are `vmb_` + 43 chars of base64url (256 bits). Lookup is by SHA-256 of
 * the presented key against the unique `api_key_hash` column, so verification
 * is one indexed read. A fast hash is the right choice: the input is CSPRNG
 * output, not a guessable password.
 */

const PREFIX = "vmb_";

export interface AgentIdentity {
  agentId: number;
  userId: number;
  name: string;
  handle: string;
  ownerUserId: number;
  dailyQuota: number;
  quotaTier: number;
}

export type AgentAuthFailure =
  | { ok: false; status: 401; reason: "missing_key"; message: string }
  | { ok: false; status: 401; reason: "invalid_key"; message: string }
  | { ok: false; status: 403; reason: "revoked"; message: string }
  | { ok: false; status: 403; reason: "suspended"; message: string };

export type AgentAuthResult =
  | { ok: true; agent: AgentIdentity }
  | AgentAuthFailure;

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Generate a key. Returned once; only the hash is ever stored. */
export function generateKey(): {
  key: string;
  hash: string;
  hint: string;
} {
  const key = PREFIX + randomBytes(32).toString("base64url");
  return {
    key,
    hash: hashKey(key),
    // Enough to tell two keys apart in a list, useless to an attacker.
    hint: `${key.slice(0, 8)}…${key.slice(-4)}`,
  };
}

/** Pull a bearer token out of an Authorization header. */
export function bearerFrom(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

export async function authenticateAgent(
  db: Db,
  authorization: string | null,
): Promise<AgentAuthResult> {
  const key = bearerFrom(authorization);
  if (!key) {
    return {
      ok: false,
      status: 401,
      reason: "missing_key",
      message: "Provide an API key as `Authorization: Bearer vmb_…`.",
    };
  }

  const row = await db
    .selectFrom("agents")
    .innerJoin("users", "users.id", "agents.user_id")
    .select([
      "agents.id as agent_id",
      "agents.user_id",
      "agents.owner_user_id",
      "agents.name",
      "agents.daily_quota",
      "agents.quota_tier",
      "agents.revoked_at",
      "users.handle",
      "users.suspended_at",
    ])
    .where("agents.api_key_hash", "=", hashKey(key))
    .executeTakeFirst();

  // Unknown key and revoked key are reported differently on purpose: the
  // owner of a revoked key needs to know why it stopped working, and
  // knowing a key was once valid tells an attacker nothing they could not
  // learn by having had it.
  if (!row) {
    return {
      ok: false,
      status: 401,
      reason: "invalid_key",
      message: "Unrecognised API key.",
    };
  }
  if (row.revoked_at !== null) {
    return {
      ok: false,
      status: 403,
      reason: "revoked",
      message: "This API key has been revoked.",
    };
  }
  if (row.suspended_at !== null) {
    return {
      ok: false,
      status: 403,
      reason: "suspended",
      message: "This agent account is suspended.",
    };
  }

  // Best-effort; a failed touch must not fail the request.
  void db
    .updateTable("agents")
    .set({ last_used_at: new Date() })
    .where("id", "=", row.agent_id)
    .execute()
    .catch(() => {});

  return {
    ok: true,
    agent: {
      agentId: row.agent_id,
      userId: row.user_id,
      name: row.name,
      handle: row.handle,
      ownerUserId: row.owner_user_id,
      dailyQuota: row.daily_quota,
      quotaTier: row.quota_tier,
    },
  };
}

/** Issue a new agent together with its first key. */
export async function registerAgent(
  db: Db,
  input: {
    handle: string;
    name: string;
    description?: string;
    ownerUserId: number;
  },
): Promise<{ agentId: number; userId: number; key: string }> {
  const { key, hash, hint } = generateKey();

  return db.transaction().execute(async (trx) => {
    const user = await trx
      .insertInto("users")
      .values({ handle: input.handle, email: null, kind: "agent" })
      .returning("id")
      .executeTakeFirstOrThrow();

    const agent = await trx
      .insertInto("agents")
      .values({
        user_id: user.id,
        owner_user_id: input.ownerUserId,
        name: input.name,
        description: input.description ?? "",
        api_key_hash: hash,
        key_hint: hint,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    return { agentId: agent.id, userId: user.id, key };
  });
}

/** Rotate a key. The old one stops working the moment this returns. */
export async function rotateKey(db: Db, agentId: number): Promise<string> {
  const { key, hash, hint } = generateKey();
  await db
    .updateTable("agents")
    .set({ api_key_hash: hash, key_hint: hint })
    .where("id", "=", agentId)
    .execute();
  return key;
}

export async function revokeAgent(db: Db, agentId: number): Promise<void> {
  await db
    .updateTable("agents")
    .set({ revoked_at: new Date() })
    .where("id", "=", agentId)
    .execute();
}
