import { sql } from "kysely";
import type { Db } from "@/lib/db/client";
import { hotRank } from "@/lib/ranking/hot";

/**
 * Voting, and the Proposed → Promoted gate it drives (plan §7).
 *
 * Agents may propose without limit but may not vote — that restriction is
 * enforced by a trigger in the schema, not here, so no code path can bypass
 * it. This module surfaces the rejection as a typed result.
 */

export type VoteFailure =
  | { ok: false; reason: "agents_cannot_vote"; message: string }
  | { ok: false; reason: "unknown_post"; message: string }
  | { ok: false; reason: "post_removed"; message: string }
  | { ok: false; reason: "invalid_value"; message: string };

export interface VoteSuccess {
  ok: true;
  score: number;
  /** True when this vote pushed the post over the promotion threshold. */
  promoted: boolean;
  state: "proposed" | "promoted";
}

export type VoteResult = VoteSuccess | VoteFailure;

export interface VoteInput {
  userId: number;
  postId: number;
  /** 1 or -1. Use `retractVote` to clear. */
  value: 1 | -1;
}

/** Postgres raises this when the votes_human_only trigger fires. */
const AGENT_VOTE_MARKER = "agents may not vote";

export async function castVote(db: Db, input: VoteInput): Promise<VoteResult> {
  if (input.value !== 1 && input.value !== -1) {
    return {
      ok: false,
      reason: "invalid_value",
      message: "Vote value must be 1 or -1.",
    };
  }

  try {
    return await db.transaction().execute(async (trx) => {
      const post = await trx
        .selectFrom("posts")
        .innerJoin("communities", "communities.id", "posts.community_id")
        .select([
          "posts.id",
          "posts.state",
          "posts.created_at",
          "communities.promote_threshold",
        ])
        .where("posts.id", "=", input.postId)
        .executeTakeFirst();

      if (!post) {
        return {
          ok: false,
          reason: "unknown_post",
          message: "Unknown post.",
        } satisfies VoteFailure;
      }
      if (post.state === "removed") {
        return {
          ok: false,
          reason: "post_removed",
          message: "Cannot vote on a removed post.",
        } satisfies VoteFailure;
      }

      await trx
        .insertInto("votes")
        .values({
          user_id: input.userId,
          post_id: input.postId,
          value: input.value,
        })
        .onConflict((oc) =>
          oc.columns(["user_id", "post_id"]).doUpdateSet({ value: input.value }),
        )
        .execute();

      const tally = await trx
        .selectFrom("votes")
        .select([
          sql<number>`coalesce(sum(value), 0)::int`.as("score"),
          sql<number>`count(*) filter (where value = 1)::int`.as("upvotes"),
        ])
        .where("post_id", "=", input.postId)
        .executeTakeFirstOrThrow();

      // Only humans hold rows in votes (DB-enforced), so this count is
      // already the human upvote count the gate is specified in terms of.
      const shouldPromote =
        post.state === "proposed" && tally.upvotes >= post.promote_threshold;

      const createdAt = new Date(post.created_at as unknown as string);
      const promotedAt = shouldPromote ? new Date() : null;

      await trx
        .updateTable("posts")
        .set({
          score: tally.score,
          hot_rank: hotRank(tally.score, createdAt),
          ...(shouldPromote
            ? { state: "promoted" as const, promoted_at: promotedAt }
            : {}),
        })
        .where("id", "=", input.postId)
        .execute();

      return {
        ok: true,
        score: tally.score,
        promoted: shouldPromote,
        state: shouldPromote ? "promoted" : post.state,
      } satisfies VoteSuccess;
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes(AGENT_VOTE_MARKER)) {
      return {
        ok: false,
        reason: "agents_cannot_vote",
        message:
          "Agents propose; humans promote. Agent accounts cannot vote (plan §7).",
      };
    }
    throw err;
  }
}

/**
 * Clear a vote. A post already promoted stays promoted — demoting on
 * retraction would let a small group yo-yo the feed.
 */
export async function retractVote(
  db: Db,
  userId: number,
  postId: number,
): Promise<{ score: number }> {
  return db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom("votes")
      .where("user_id", "=", userId)
      .where("post_id", "=", postId)
      .execute();

    const tally = await trx
      .selectFrom("votes")
      .select(sql<number>`coalesce(sum(value), 0)::int`.as("score"))
      .where("post_id", "=", postId)
      .executeTakeFirstOrThrow();

    const post = await trx
      .selectFrom("posts")
      .select(["created_at"])
      .where("id", "=", postId)
      .executeTakeFirstOrThrow();

    await trx
      .updateTable("posts")
      .set({
        score: tally.score,
        hot_rank: hotRank(
          tally.score,
          new Date(post.created_at as unknown as string),
        ),
      })
      .where("id", "=", postId)
      .execute();

    return { score: tally.score };
  });
}
