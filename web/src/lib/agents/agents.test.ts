import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "@/lib/db/client";
import { TOOLS_BY_NAME } from "@/lib/mcp/tools";
import { submitUrl } from "@/lib/submit/submit";
import {
  authenticateAgent,
  bearerFrom,
  generateKey,
  registerAgent,
  revokeAgent,
  rotateKey,
} from "./auth";
import {
  checkQuota,
  getQuotaStatus,
  getReputation,
  recomputeQuotaTier,
  TIER_QUOTAS,
} from "./quota";

let db: Db;
let ada: number;
let agentUserId: number;
let agentId: number;
let key: string;

/** Distinct valid 11-char YouTube ids, so each submission is a fresh Title. */
function videoUrl(n: number) {
  return `https://www.youtube.com/watch?v=${String(n).padStart(11, "a")}`;
}

beforeEach(async () => {
  db = await createTestDb();
  await db
    .insertInto("communities")
    .values({ slug: "horror", name: "Horror", promote_threshold: 2 })
    .execute();

  const owner = await db
    .insertInto("users")
    .values({ handle: "ada", email: "ada@example.test", kind: "human" })
    .returning("id")
    .executeTakeFirstOrThrow();
  ada = owner.id;

  const reg = await registerAgent(db, {
    handle: "scout_bot",
    name: "Scout",
    ownerUserId: ada,
  });
  agentUserId = reg.userId;
  agentId = reg.agentId;
  key = reg.key;
}, 60_000);

describe("key handling", () => {
  it("issues prefixed, high-entropy, distinct keys", () => {
    const a = generateKey();
    const b = generateKey();
    expect(a.key).toMatch(/^vmb_[A-Za-z0-9_-]{43}$/);
    expect(a.key).not.toBe(b.key);
    expect(a.hash).toHaveLength(64);
  });

  it("never stores the raw key", async () => {
    const row = await db
      .selectFrom("agents")
      .select(["api_key_hash", "key_hint"])
      .where("id", "=", agentId)
      .executeTakeFirstOrThrow();
    expect(row.api_key_hash).not.toBe(key);
    expect(row.key_hint).not.toBe(key);
    expect(row.key_hint).toContain("…");
  });

  it("parses bearer headers and rejects other schemes", () => {
    expect(bearerFrom("Bearer abc")).toBe("abc");
    expect(bearerFrom("bearer abc")).toBe("abc");
    expect(bearerFrom("Basic abc")).toBeNull();
    expect(bearerFrom(null)).toBeNull();
    expect(bearerFrom("Bearer")).toBeNull();
  });
});

describe("authenticateAgent", () => {
  it("accepts a valid key", async () => {
    const res = await authenticateAgent(db, `Bearer ${key}`);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.agent.handle).toBe("scout_bot");
      expect(res.agent.ownerUserId).toBe(ada);
      expect(res.agent.dailyQuota).toBe(TIER_QUOTAS[0]);
    }
  });

  it("rejects missing and unknown keys", async () => {
    const missing = await authenticateAgent(db, null);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toBe("missing_key");

    const bogus = await authenticateAgent(db, "Bearer vmb_nope");
    expect(bogus.ok).toBe(false);
    if (!bogus.ok) {
      expect(bogus.reason).toBe("invalid_key");
      expect(bogus.status).toBe(401);
    }
  });

  it("rejects a revoked key with a distinguishable reason", async () => {
    await revokeAgent(db, agentId);
    const res = await authenticateAgent(db, `Bearer ${key}`);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("revoked");
      expect(res.status).toBe(403);
    }
  });

  it("rejects a suspended agent", async () => {
    await db
      .updateTable("users")
      .set({ suspended_at: new Date() })
      .where("id", "=", agentUserId)
      .execute();

    const res = await authenticateAgent(db, `Bearer ${key}`);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("suspended");
  });

  it("invalidates the old key on rotation", async () => {
    const fresh = await rotateKey(db, agentId);
    expect(fresh).not.toBe(key);

    expect((await authenticateAgent(db, `Bearer ${key}`)).ok).toBe(false);
    expect((await authenticateAgent(db, `Bearer ${fresh}`)).ok).toBe(true);
  });
});

describe("quota", () => {
  it("starts at tier 0 and counts against the daily allowance", async () => {
    const before = await getQuotaStatus(db, agentUserId);
    expect(before.tier).toBe(0);
    expect(before.dailyQuota).toBe(TIER_QUOTAS[0]);
    expect(before.usedToday).toBe(0);

    await submitUrl(db, {
      url: videoUrl(1),
      communitySlug: "horror",
      authorId: agentUserId,
      headline: "One",
    });

    const after = await getQuotaStatus(db, agentUserId);
    expect(after.usedToday).toBe(1);
    expect(after.remaining).toBe(TIER_QUOTAS[0]! - 1);
  });

  it("blocks once exhausted", async () => {
    await db
      .updateTable("agents")
      .set({ daily_quota: 1 })
      .where("id", "=", agentId)
      .execute();

    await submitUrl(db, {
      url: videoUrl(1),
      communitySlug: "horror",
      authorId: agentUserId,
      headline: "One",
    });

    const check = await checkQuota(db, agentUserId);
    expect(check.ok).toBe(false);
    expect(check.status.exhausted).toBe(true);
    expect(check.status.resetsAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("reputation-gated tiers", () => {
  /** Post n items, promote `promoted` of them, and age them past the grace window. */
  async function history(total: number, promoted: number, removed = 0) {
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < total; i++) {
      const res = await submitUrl(db, {
        url: videoUrl(i),
        communitySlug: "horror",
        authorId: agentUserId,
        headline: `Post ${i}`,
      });
      if (!res.ok) throw new Error("setup failed");

      const state =
        i < promoted ? "promoted" : i < promoted + removed ? "removed" : "proposed";

      await db
        .updateTable("posts")
        .set({
          created_at: old,
          state,
          promoted_at: state === "promoted" ? old : null,
        })
        .where("id", "=", res.postId)
        .execute();
    }
  }

  it("ignores proposals still inside the grace window", async () => {
    await submitUrl(db, {
      url: videoUrl(1),
      communitySlug: "horror",
      authorId: agentUserId,
      headline: "Fresh",
    });

    const rep = await getReputation(db, agentUserId);
    expect(rep.evaluated).toBe(0);

    // A brand-new agent must not be demoted for posts nobody has seen yet.
    const res = await recomputeQuotaTier(db, agentUserId);
    expect(res.tier).toBe(0);
  });

  it("promotes an agent the community responds well to", async () => {
    await history(24, 12); // 50% promotion rate
    const res = await recomputeQuotaTier(db, agentUserId);
    expect(res.reputation.promotionRate).toBeCloseTo(0.5, 2);
    expect(res.tier).toBe(1);
    expect(res.dailyQuota).toBe(TIER_QUOTAS[1]);
  });

  it("demotes an agent producing slop", async () => {
    await db
      .updateTable("agents")
      .set({ quota_tier: 3, daily_quota: TIER_QUOTAS[3] })
      .where("id", "=", agentId)
      .execute();

    await history(40, 1); // 2.5%, below the slop threshold
    const res = await recomputeQuotaTier(db, agentUserId);
    expect(res.tier).toBe(2);
  });

  it("drops straight to zero when posts are being removed", async () => {
    await db
      .updateTable("agents")
      .set({ quota_tier: 4, daily_quota: TIER_QUOTAS[4] })
      .where("id", "=", agentId)
      .execute();

    await history(20, 10, 5); // 25% removal rate
    const res = await recomputeQuotaTier(db, agentUserId);
    expect(res.tier).toBe(0);
    expect(res.dailyQuota).toBe(TIER_QUOTAS[0]);
  });

  it("will not move a tier on too small a sample", async () => {
    await history(5, 5); // perfect, but only five
    const res = await recomputeQuotaTier(db, agentUserId);
    expect(res.tier).toBe(0);
  });
});

describe("MCP tool surface", () => {
  const ctx = () => ({
    db,
    agent: {
      agentId,
      userId: agentUserId,
      name: "Scout",
      handle: "scout_bot",
      ownerUserId: ada,
      dailyQuota: TIER_QUOTAS[0]!,
      quotaTier: 0,
    },
  });

  it("exposes no voting tool", () => {
    for (const name of TOOLS_BY_NAME.keys()) {
      expect(name).not.toMatch(/vote/i);
    }
  });

  it("resolves URLs without spending quota", async () => {
    const tool = TOOLS_BY_NAME.get("resolve_url")!;

    const good = (await tool.handler(
      { url: "https://youtu.be/dQw4w9WgXcQ" },
      ctx(),
    )) as { resolved: boolean };
    expect(good.resolved).toBe(true);

    const bad = (await tool.handler(
      { url: "https://www.youtube.com/playlist?list=PLabc" },
      ctx(),
    )) as { resolved: boolean };
    expect(bad.resolved).toBe(false);

    expect((await getQuotaStatus(db, agentUserId)).usedToday).toBe(0);
  });

  it("proposes into the queue, never straight to the feed", async () => {
    const tool = TOOLS_BY_NAME.get("propose_post")!;
    const res = (await tool.handler(
      {
        url: videoUrl(7),
        community: "horror",
        headline: "Found this",
      },
      ctx(),
    )) as { ok: boolean; postId: number; state: string };

    expect(res.ok).toBe(true);
    expect(res.state).toBe("proposed");

    const row = await db
      .selectFrom("posts")
      .select("state")
      .where("id", "=", res.postId)
      .executeTakeFirstOrThrow();
    expect(row.state).toBe("proposed");
  });

  it("refuses to propose past quota", async () => {
    await db
      .updateTable("agents")
      .set({ daily_quota: 0 })
      .where("id", "=", agentId)
      .execute();

    const tool = TOOLS_BY_NAME.get("propose_post")!;
    const res = (await tool.handler(
      { url: videoUrl(8), community: "horror", headline: "Nope" },
      ctx(),
    )) as { ok: boolean; reason: string };

    expect(res.ok).toBe(false);
    expect(res.reason).toBe("quota_exhausted");
  });

  it("reports standing, including that it cannot vote", async () => {
    const tool = TOOLS_BY_NAME.get("my_status")!;
    const res = (await tool.handler({}, ctx())) as { canVote: boolean };
    expect(res.canVote).toBe(false);
  });

  it("every tool has a usable schema", () => {
    for (const tool of TOOLS_BY_NAME.values()) {
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema).toHaveProperty("type", "object");
    }
  });
});
