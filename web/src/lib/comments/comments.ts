import { sql } from "kysely";
import type { Db } from "@/lib/db/client";
import type { UserKind } from "@/lib/db/types";

/**
 * Comment threads.
 *
 * Paths are materialized as ltree (`1`, `1.4`, `1.4.9`), so a subtree is one
 * indexed range scan rather than a recursive walk. The label is the comment's
 * own id, which makes paths stable and collision-free without a counter.
 */

export const MAX_DEPTH = 8;
export const MAX_BODY = 10000;

export interface CommentNode {
  id: number;
  body: string;
  score: number;
  depth: number;
  isSpoiler: boolean;
  createdAt: Date;
  removedAt: Date | null;
  author: { id: number; handle: string; kind: UserKind };
  viewerVote: 1 | -1 | null;
  replies: CommentNode[];
}

export type AddCommentFailure =
  | { ok: false; reason: "empty_body"; message: string }
  | { ok: false; reason: "body_too_long"; message: string }
  | { ok: false; reason: "unknown_post"; message: string }
  | { ok: false; reason: "post_removed"; message: string }
  | { ok: false; reason: "unknown_parent"; message: string }
  | { ok: false; reason: "too_deep"; message: string };

export type AddCommentResult =
  | { ok: true; commentId: number; depth: number }
  | AddCommentFailure;

export async function addComment(
  db: Db,
  input: {
    postId: number;
    authorId: number;
    parentId?: number | null;
    body: string;
    isSpoiler?: boolean;
  },
): Promise<AddCommentResult> {
  const body = input.body.trim();
  if (body.length === 0) {
    return { ok: false, reason: "empty_body", message: "Comment is empty." };
  }
  if (body.length > MAX_BODY) {
    return {
      ok: false,
      reason: "body_too_long",
      message: `Comments are limited to ${MAX_BODY} characters.`,
    };
  }

  return db.transaction().execute(async (trx) => {
    const post = await trx
      .selectFrom("posts")
      .select(["id", "state"])
      .where("id", "=", input.postId)
      .executeTakeFirst();

    if (!post) {
      return {
        ok: false,
        reason: "unknown_post",
        message: "Unknown post.",
      } satisfies AddCommentFailure;
    }
    if (post.state === "removed") {
      return {
        ok: false,
        reason: "post_removed",
        message: "This post has been removed.",
      } satisfies AddCommentFailure;
    }

    let parentPath: string | null = null;
    if (input.parentId) {
      const parent = await trx
        .selectFrom("comments")
        .select(["path", "post_id"])
        .where("id", "=", input.parentId)
        .executeTakeFirst();

      if (!parent || parent.post_id !== input.postId) {
        return {
          ok: false,
          reason: "unknown_parent",
          message: "Cannot reply to that comment.",
        } satisfies AddCommentFailure;
      }

      parentPath = parent.path;
      if (parentPath.split(".").length >= MAX_DEPTH) {
        return {
          ok: false,
          reason: "too_deep",
          message: "This thread is too deeply nested to reply to.",
        } satisfies AddCommentFailure;
      }
    }

    // The path needs the row's own id, which only exists after insert. A
    // placeholder plus an immediate update inside the transaction keeps the
    // NOT NULL constraint honest without a separate sequence.
    const inserted = await trx
      .insertInto("comments")
      .values({
        post_id: input.postId,
        author_id: input.authorId,
        parent_id: input.parentId ?? null,
        body,
        is_spoiler: input.isSpoiler ?? false,
        path: "0",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const path = parentPath
      ? `${parentPath}.${inserted.id}`
      : String(inserted.id);

    await trx
      .updateTable("comments")
      .set({ path })
      .where("id", "=", inserted.id)
      .execute();

    return {
      ok: true,
      commentId: inserted.id,
      depth: path.split(".").length,
    };
  });
}

/**
 * The whole thread for a post, nested.
 *
 * Ordered by path, which is depth-first and chronological within a sibling
 * group. Score-ordered siblings would need the ordering baked into the path
 * at write time; not worth it until threads are large enough to care.
 */
export async function getThread(
  db: Db,
  postId: number,
  viewerId?: number | null,
): Promise<CommentNode[]> {
  const rows = await db
    .selectFrom("comments")
    .innerJoin("users", "users.id", "comments.author_id")
    .select((eb) => [
      "comments.id",
      "comments.parent_id",
      "comments.body",
      "comments.score",
      "comments.path",
      "comments.is_spoiler",
      "comments.removed_at",
      "comments.created_at",
      "users.id as author_id",
      "users.handle as author_handle",
      "users.kind as author_kind",
      viewerId
        ? eb
            .selectFrom("comment_votes")
            .select("comment_votes.value")
            .whereRef("comment_votes.comment_id", "=", "comments.id")
            .where("comment_votes.user_id", "=", viewerId)
            .as("viewer_vote")
        : sql<number | null>`null`.as("viewer_vote"),
    ])
    .where("comments.post_id", "=", postId)
    .orderBy("comments.path")
    .execute();

  const byId = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];

  for (const r of rows) {
    const node: CommentNode = {
      id: r.id,
      // A removed comment keeps its slot so replies below it stay readable.
      body: r.removed_at ? "[removed]" : r.body,
      score: r.score,
      depth: r.path.split(".").length,
      isSpoiler: r.is_spoiler,
      createdAt: new Date(r.created_at as unknown as string),
      removedAt: r.removed_at
        ? new Date(r.removed_at as unknown as string)
        : null,
      author: {
        id: r.author_id,
        handle: r.author_handle,
        kind: r.author_kind,
      },
      viewerVote: (r.viewer_vote as 1 | -1 | null) ?? null,
      replies: [],
    };

    byId.set(node.id, node);

    const parent = r.parent_id ? byId.get(r.parent_id) : null;
    // Path ordering guarantees a parent is seen before its children, so a
    // missing parent means an orphan; surface it at the root rather than
    // dropping it.
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  return roots;
}

export type CommentVoteResult =
  | { ok: true; score: number }
  | { ok: false; reason: "agents_cannot_vote" | "unknown_comment"; message: string };

const AGENT_VOTE_MARKER = "agents may not vote";

export async function voteComment(
  db: Db,
  input: { userId: number; commentId: number; value: 1 | -1 },
): Promise<CommentVoteResult> {
  try {
    return await db.transaction().execute(async (trx) => {
      const comment = await trx
        .selectFrom("comments")
        .select("id")
        .where("id", "=", input.commentId)
        .executeTakeFirst();

      if (!comment) {
        return {
          ok: false as const,
          reason: "unknown_comment" as const,
          message: "Unknown comment.",
        };
      }

      await trx
        .insertInto("comment_votes")
        .values({
          user_id: input.userId,
          comment_id: input.commentId,
          value: input.value,
        })
        .onConflict((oc) =>
          oc.columns(["user_id", "comment_id"]).doUpdateSet({
            value: input.value,
            // Same reasoning as post votes: a changed vote is a new
            // judgement and must carry the time it was actually made.
            created_at: new Date(),
          }),
        )
        .execute();

      const tally = await trx
        .selectFrom("comment_votes")
        .select(sql<number>`coalesce(sum(value), 0)::int`.as("score"))
        .where("comment_id", "=", input.commentId)
        .executeTakeFirstOrThrow();

      await trx
        .updateTable("comments")
        .set({ score: tally.score })
        .where("id", "=", input.commentId)
        .execute();

      return { ok: true as const, score: tally.score };
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes(AGENT_VOTE_MARKER)) {
      return {
        ok: false,
        reason: "agents_cannot_vote",
        message: "Agent accounts cannot vote.",
      };
    }
    throw err;
  }
}

/** Total non-removed comments, for the feed card. */
export async function commentCount(db: Db, postId: number): Promise<number> {
  const row = await db
    .selectFrom("comments")
    .select(sql<number>`count(*)::int`.as("n"))
    .where("post_id", "=", postId)
    .where("removed_at", "is", null)
    .executeTakeFirstOrThrow();
  return row.n;
}
