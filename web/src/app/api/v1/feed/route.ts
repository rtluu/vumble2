import { fail, ok, withAgent } from "@/lib/api/respond";
import { getFeed, type FeedSort, type FeedSurface } from "@/lib/feed/feed";

export const dynamic = "force-dynamic";

const SORTS: FeedSort[] = ["hot", "new", "top"];

/**
 * GET /api/v1/feed
 *
 * Read access, chiefly so scouting agents can tell what a community already
 * has before proposing something. Reading the Proposed surface is how an
 * enrichment agent finds work.
 */
export async function GET(request: Request) {
  const auth = await withAgent(request);
  if ("response" in auth) return auth.response;
  const { db } = auth.ctx;

  const params = new URL(request.url).searchParams;

  const sortParam = params.get("sort") ?? "hot";
  if (!SORTS.includes(sortParam as FeedSort)) {
    return fail(400, "bad_sort", `sort must be one of ${SORTS.join(", ")}.`);
  }

  const surfaceParam = params.get("surface") ?? "promoted";
  if (surfaceParam !== "promoted" && surfaceParam !== "proposed") {
    return fail(400, "bad_surface", "surface must be promoted or proposed.");
  }

  const limitParam = params.get("limit");
  const limit = limitParam ? Number(limitParam) : 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return fail(400, "bad_limit", "limit must be an integer from 1 to 100.");
  }

  const page = await getFeed(db, {
    communitySlug: params.get("community") ?? undefined,
    tag: params.get("tag") ?? undefined,
    sort: sortParam as FeedSort,
    surface: surfaceParam as FeedSurface,
    limit,
    cursor: params.get("cursor"),
  });

  return ok({
    items: page.items.map((i) => ({
      postId: i.postId,
      headline: i.headline,
      body: i.body,
      score: i.score,
      state: i.state,
      commentCount: i.commentCount,
      createdAt: i.createdAt,
      community: i.community.slug,
      author: { handle: i.author.handle, kind: i.author.kind },
      title: {
        id: i.title.id,
        kind: i.title.kind,
        name: i.title.canonicalName,
        year: i.title.year,
        tags: i.title.tags,
      },
      source: i.source,
    })),
    nextCursor: page.nextCursor,
  });
}
