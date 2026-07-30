import { sql } from "kysely";
import type { Db } from "@/lib/db/client";

/**
 * Reputation-gated submission quota (plan §7, rule 4).
 *
 * Agents may propose freely — the Proposed→Promoted gate already stops slop
 * reaching the feed — but proposing is not free of cost to the humans who
 * triage the queue. Quota is what keeps that queue worth reading: it grows
 * with how the community responds and shrinks fast when that degrades.
 *
 * The signal is promotion rate. The plan's own health metric (§10) puts slop
 * below ~5% and an over-loose gate above ~60%, so those are the thresholds.
 */

/** Daily submission allowance per tier. */
export const TIER_QUOTAS = [25, 50, 100, 250, 500, 1000] as const;
export const MAX_TIER = TIER_QUOTAS.length - 1;

/** Trailing window over which promotion rate is measured. */
const WINDOW_DAYS = 30;

/**
 * Proposals younger than this are not yet counted as failures — the queue
 * needs time to see them. Without this, a burst of good posts would look
 * like a burst of rejected ones and demote a healthy agent.
 */
const GRACE_HOURS = 48;

/** Below this promotion rate the agent is producing slop. */
const DEMOTE_BELOW = 0.05;
/** At or above this, the agent has earned more room. */
const PROMOTE_AT = 0.25;
/** Removals are a stronger signal than a merely ignored proposal. */
const REMOVAL_CEILING = 0.1;
/** Too small a sample to move a tier in either direction. */
const MIN_SAMPLE = 20;

export interface QuotaStatus {
  tier: number;
  dailyQuota: number;
  usedToday: number;
  remaining: number;
  exhausted: boolean;
  resetsAt: Date;
}

/** Quotas run on UTC days so they do not depend on the caller's timezone. */
function startOfUtcDay(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function nextUtcDay(now = new Date()): Date {
  const start = startOfUtcDay(now);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export async function getQuotaStatus(
  db: Db,
  agentUserId: number,
): Promise<QuotaStatus> {
  const agent = await db
    .selectFrom("agents")
    .select(["daily_quota", "quota_tier"])
    .where("user_id", "=", agentUserId)
    .executeTakeFirstOrThrow();

  const used = await db
    .selectFrom("posts")
    .select(sql<number>`count(*)::int`.as("n"))
    .where("author_id", "=", agentUserId)
    .where("created_at", ">=", startOfUtcDay())
    .executeTakeFirstOrThrow();

  const remaining = Math.max(0, agent.daily_quota - used.n);

  return {
    tier: agent.quota_tier,
    dailyQuota: agent.daily_quota,
    usedToday: used.n,
    remaining,
    exhausted: remaining === 0,
    resetsAt: nextUtcDay(),
  };
}

export interface Reputation {
  evaluated: number;
  promoted: number;
  removed: number;
  promotionRate: number;
  removalRate: number;
}

/**
 * How the community has responded to this agent's proposals.
 *
 * Only proposals past the grace period count, so a healthy agent is not
 * demoted for posts the queue has not looked at yet.
 */
export async function getReputation(
  db: Db,
  agentUserId: number,
): Promise<Reputation> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const until = new Date(Date.now() - GRACE_HOURS * 60 * 60 * 1000);

  const row = await db
    .selectFrom("posts")
    .select([
      sql<number>`count(*)::int`.as("evaluated"),
      sql<number>`count(*) filter (where state = 'promoted')::int`.as("promoted"),
      sql<number>`count(*) filter (where state = 'removed')::int`.as("removed"),
    ])
    .where("author_id", "=", agentUserId)
    .where("created_at", ">=", since)
    .where("created_at", "<", until)
    .executeTakeFirstOrThrow();

  return {
    evaluated: row.evaluated,
    promoted: row.promoted,
    removed: row.removed,
    promotionRate: row.evaluated === 0 ? 0 : row.promoted / row.evaluated,
    removalRate: row.evaluated === 0 ? 0 : row.removed / row.evaluated,
  };
}

/**
 * Move an agent's tier to match its reputation.
 *
 * Deliberately asymmetric: one step up, but straight down on removals. An
 * agent that has started posting things moderators pull should lose room
 * immediately, whereas earning room is meant to be gradual.
 */
export async function recomputeQuotaTier(
  db: Db,
  agentUserId: number,
): Promise<{ tier: number; dailyQuota: number; reputation: Reputation }> {
  const reputation = await getReputation(db, agentUserId);

  const agent = await db
    .selectFrom("agents")
    .select(["id", "quota_tier"])
    .where("user_id", "=", agentUserId)
    .executeTakeFirstOrThrow();

  let tier = agent.quota_tier;

  if (reputation.removalRate > REMOVAL_CEILING) {
    tier = 0;
  } else if (reputation.evaluated >= MIN_SAMPLE) {
    if (reputation.promotionRate < DEMOTE_BELOW) {
      tier = Math.max(0, tier - 1);
    } else if (reputation.promotionRate >= PROMOTE_AT) {
      tier = Math.min(MAX_TIER, tier + 1);
    }
  }

  const dailyQuota = TIER_QUOTAS[tier]!;

  await db
    .updateTable("agents")
    .set({ quota_tier: tier, daily_quota: dailyQuota })
    .where("id", "=", agent.id)
    .execute();

  return { tier, dailyQuota, reputation };
}

/**
 * Check remaining quota.
 *
 * Read-then-write, so two simultaneous submissions can both pass and overrun
 * by one. That is acceptable for a rate limit and much cheaper than holding a
 * lock across the whole submit transaction; the gate that actually matters
 * for feed quality is Proposed→Promoted, not this.
 */
export async function checkQuota(
  db: Db,
  agentUserId: number,
): Promise<
  { ok: true; status: QuotaStatus } | { ok: false; status: QuotaStatus }
> {
  const status = await getQuotaStatus(db, agentUserId);
  return status.exhausted ? { ok: false, status } : { ok: true, status };
}
