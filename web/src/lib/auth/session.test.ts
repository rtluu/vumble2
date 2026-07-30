import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "@/lib/db/client";
import {
  createSession,
  destroyAllSessions,
  destroySession,
  purgeExpiredSessions,
  resolveSession,
} from "./session";

let db: Db;
let alice: number;
let scoutBot: number;

const hashOf = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/**
 * Force a session into the past. Both timestamps move, because
 * `sessions_expire_after_creation` (correctly) rejects a row that expires
 * before it was created.
 */
async function expire(token: string) {
  const created = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const expires = new Date(Date.now() - 60 * 60 * 1000);
  await db
    .updateTable("sessions")
    .set({ created_at: created, expires_at: expires })
    .where("token_hash", "=", hashOf(token))
    .execute();
}

async function mkUser(handle: string, kind: "human" | "agent" = "human") {
  const row = await db
    .insertInto("users")
    .values({
      handle,
      email: kind === "human" ? `${handle}@example.test` : null,
      kind,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

beforeEach(async () => {
  db = await createTestDb();
  alice = await mkUser("alice");
  scoutBot = await mkUser("scout_bot", "agent");
}, 60_000);

describe("createSession", () => {
  it("issues a token that resolves to its user", async () => {
    const { token } = await createSession(db, alice);
    const user = await resolveSession(db, token);
    expect(user).toEqual({ id: alice, handle: "alice", kind: "human" });
  });

  it("never stores the raw token", async () => {
    const { token } = await createSession(db, alice);
    const rows = await db.selectFrom("sessions").selectAll().execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.token_hash).not.toBe(token);
    expect(rows[0]!.token_hash).toHaveLength(64);
  });

  it("issues distinct tokens", async () => {
    const a = await createSession(db, alice);
    const b = await createSession(db, alice);
    expect(a.token).not.toBe(b.token);
    expect(await resolveSession(db, a.token)).not.toBeNull();
    expect(await resolveSession(db, b.token)).not.toBeNull();
  });

  it("refuses to create a session for an agent", async () => {
    await expect(createSession(db, scoutBot)).rejects.toThrow(
      /agents authenticate by API key/,
    );
  });
});

describe("resolveSession", () => {
  it("returns null for missing, empty, and unknown tokens", async () => {
    expect(await resolveSession(db, undefined)).toBeNull();
    expect(await resolveSession(db, null)).toBeNull();
    expect(await resolveSession(db, "")).toBeNull();
    expect(await resolveSession(db, "not-a-real-token")).toBeNull();
  });

  it("rejects an expired session and cleans it up", async () => {
    const { token } = await createSession(db, alice);
    await expire(token);

    expect(await resolveSession(db, token)).toBeNull();
    expect(await db.selectFrom("sessions").selectAll().execute()).toHaveLength(0);
  });

  it("rejects a session belonging to a suspended user", async () => {
    const { token } = await createSession(db, alice);
    await db
      .updateTable("users")
      .set({ suspended_at: new Date() })
      .where("id", "=", alice)
      .execute();

    expect(await resolveSession(db, token)).toBeNull();
  });
});

describe("destroySession", () => {
  it("invalidates one session and leaves the others", async () => {
    const a = await createSession(db, alice);
    const b = await createSession(db, alice);

    await destroySession(db, a.token);
    expect(await resolveSession(db, a.token)).toBeNull();
    expect(await resolveSession(db, b.token)).not.toBeNull();
  });

  it("signs out everywhere", async () => {
    const a = await createSession(db, alice);
    const b = await createSession(db, alice);

    await destroyAllSessions(db, alice);
    expect(await resolveSession(db, a.token)).toBeNull();
    expect(await resolveSession(db, b.token)).toBeNull();
  });

  it("cascades when the user is deleted", async () => {
    const { token } = await createSession(db, alice);
    await db.deleteFrom("users").where("id", "=", alice).execute();
    expect(await resolveSession(db, token)).toBeNull();
  });
});

describe("purgeExpiredSessions", () => {
  it("removes only expired rows", async () => {
    const live = await createSession(db, alice);
    const dead = await createSession(db, alice);
    await expire(dead.token);

    const removed = await purgeExpiredSessions(db);
    expect(removed).toBe(1);
    expect(await resolveSession(db, live.token)).not.toBeNull();
    expect(await resolveSession(db, dead.token)).toBeNull();
  });
});
