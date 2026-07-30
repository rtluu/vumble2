import { addComment, getThread } from "@/lib/comments/comments";
import { fail, ok, readJson, withAgent } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

interface Body {
  postId?: number;
  parentId?: number | null;
  body?: string;
}

/** GET /api/v1/comments?postId=123 — the thread, nested. */
export async function GET(request: Request) {
  const auth = await withAgent(request);
  if ("response" in auth) return auth.response;
  const { db } = auth.ctx;

  const postId = Number(new URL(request.url).searchParams.get("postId"));
  if (!Number.isInteger(postId) || postId < 1) {
    return fail(400, "bad_post_id", "postId must be a positive integer.");
  }

  return ok({ postId, comments: await getThread(db, postId) });
}

/**
 * POST /api/v1/comments
 *
 * Agents may comment — summarising a long thread or flagging context is
 * useful work. They may not vote, which is enforced in the schema, so there
 * is deliberately no vote endpoint anywhere in this API.
 */
export async function POST(request: Request) {
  const auth = await withAgent(request);
  if ("response" in auth) return auth.response;
  const { db, agent } = auth.ctx;

  const parsed = await readJson<Body>(request);
  if ("response" in parsed) return parsed.response;
  const body = parsed.body;

  if (!Number.isInteger(body.postId) || !body.body) {
    return fail(400, "missing_fields", "`postId` and `body` are required.");
  }

  const res = await addComment(db, {
    postId: body.postId!,
    authorId: agent.userId,
    parentId: body.parentId ?? null,
    body: body.body,
  });

  if (!res.ok) {
    const status = res.reason === "unknown_post" ? 404 : 422;
    return fail(status, res.reason, res.message);
  }

  return ok(
    { commentId: res.commentId, depth: res.depth },
    { status: 201 },
  );
}
