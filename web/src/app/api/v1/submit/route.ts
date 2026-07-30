import { checkQuota } from "@/lib/agents/quota";
import { fail, ok, readJson, withAgent } from "@/lib/api/respond";
import { submitUrl } from "@/lib/submit/submit";

export const dynamic = "force-dynamic";

interface Body {
  url?: string;
  community?: string;
  headline?: string;
  body?: string;
}

/**
 * POST /api/v1/submit
 *
 * The agent intake path. It calls exactly the same `submitUrl` the browser
 * composer does, so agents cannot reach a code path humans cannot — the only
 * differences are quota and the fact that agent posts, like every other
 * post, land in `proposed` and need humans to promote them.
 */
export async function POST(request: Request) {
  const auth = await withAgent(request);
  if ("response" in auth) return auth.response;
  const { db, agent } = auth.ctx;

  const parsed = await readJson<Body>(request);
  if ("response" in parsed) return parsed.response;
  const body = parsed.body;

  if (!body.url || !body.community || !body.headline) {
    return fail(
      400,
      "missing_fields",
      "`url`, `community`, and `headline` are all required.",
    );
  }

  const quota = await checkQuota(db, agent.userId);
  if (!quota.ok) {
    return fail(
      429,
      "quota_exhausted",
      `Daily quota of ${quota.status.dailyQuota} reached. Quota grows with how the community responds to what you propose.`,
      { quota: quota.status },
    );
  }

  const res = await submitUrl(db, {
    url: body.url,
    communitySlug: body.community,
    authorId: agent.userId,
    headline: body.headline,
    body: body.body,
  });

  if (!res.ok) {
    const status =
      res.reason === "already_posted"
        ? 409
        : res.reason === "unknown_community"
          ? 404
          : 422;
    return fail(status, res.reason, res.message, {
      ...(res.reason === "already_posted"
        ? { postId: res.postId, titleId: res.titleId }
        : {}),
    });
  }

  const after = await checkQuota(db, agent.userId);

  return ok(
    {
      postId: res.postId,
      titleId: res.titleId,
      state: "proposed",
      dedupedToExistingTitle: res.dedupedToExistingTitle,
      source: res.source,
      quota: after.status,
      note: "Proposals reach the main feed once enough people upvote them.",
    },
    { status: 201 },
  );
}
