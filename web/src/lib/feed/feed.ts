import { sql } from "kysely";
import type { Db } from "@/lib/db/client";
import type {
  DbPlatform,
  FeedMode,
  PostState,
  TitleKind,
  UserKind,
} from "@/lib/db/types";

/**
 * Feed queries.
 *
 * Two surfaces over the same data (plan §2b): Promoted is the main feed,
 * Proposed is the opt-in queue where agent and new-user submissions wait for
 * human validation. They differ only by `state`, which is what makes the
 * gate cheap — no separate tables, no separate ranking.
 */

export type FeedSort = "hot" | "new" | "top";
export type FeedSurface = Extract<PostState, "promoted" | "proposed">;

export interface FeedSource {
  platform: DbPlatform;
  externalId: string;
  url: string;
  embeddable: boolean;
  startSeconds: number | null;
}

export interface FeedItem {
  postId: number;
  headline: string;
  body: string;
  score: number;
  state: PostState;
  createdAt: Date;
  promotedAt: Date | null;
  commentCount: number;
  author: { handle: string; kind: UserKind };
  community: { slug: string; name: string; defaultMode: FeedMode };
  title: {
    id: number;
    kind: TitleKind;
    canonicalName: string;
    posterUrl: string | null;
    runtimeSeconds: number | null;
    year: number | null;
    /** Facet tags, alphabetical. The retrieval layer (plan §2c). */
    tags: string[];
  };
  /** Null for catalog Titles with no embeddable source yet (plan §3/P2). */
  source: FeedSource | null;
  /** The viewer's own vote, when a viewer was supplied. */
  viewerVote: 1 | -1 | null;
}

export interface FeedQuery {
  communitySlug?: string;
  /** Facet tag. Cuts across communities — the retrieval axis (plan §2c). */
  tag?: string;
  sort?: FeedSort;
  surface?: FeedSurface;
  limit?: number;
  /** Opaque cursor from a previous page. */
  cursor?: string | null;
  viewerId?: number | null;
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * Keyset pagination. Offset pagination on a feed that reorders under you
 * duplicates and drops rows; a cursor on (sortValue, id) does not.
 */
interface Cursor {
  value: number;
  id: number;
}

function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.value}:${c.id}`).toString("base64url");
}

function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const [value, id] = Buffer.from(raw, "base64url").toString().split(":");
    if (value === undefined || id === undefined) return null;
    const parsed = { value: Number(value), id: Number(id) };
    if (!Number.isFinite(parsed.value) || !Number.isInteger(parsed.id)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const SORT_COLUMN = {
  hot: "posts.hot_rank",
  new: "posts.id",
  top: "posts.score",
} as const;

export async function getFeed(db: Db, query: FeedQuery = {}): Promise<FeedPage> {
  const sort: FeedSort = query.sort ?? "hot";
  const surface: FeedSurface = query.surface ?? "promoted";
  const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cursor = decodeCursor(query.cursor);
  const sortColumn = SORT_COLUMN[sort];

  let q = db
    .selectFrom("posts")
    .innerJoin("titles", "titles.id", "posts.title_id")
    .innerJoin("communities", "communities.id", "posts.community_id")
    .innerJoin("users", "users.id", "posts.author_id")
    .leftJoin(
      // One source per Title for rendering: prefer an embeddable one, then
      // the earliest added, so the choice is stable across requests.
      (eb) =>
        eb
          .selectFrom("sources")
          .select([
            "sources.title_id",
            "sources.platform",
            "sources.external_id",
            "sources.url",
            "sources.embeddable",
            "sources.start_seconds",
            sql<number>`row_number() over (
              partition by sources.title_id
              order by sources.embeddable desc, sources.id asc
            )`.as("rn"),
          ])
          .as("s"),
      (join) => join.onRef("s.title_id", "=", "titles.id").on("s.rn", "=", 1),
    )
    .select((eb) => [
      "posts.id as post_id",
      "posts.headline",
      "posts.body",
      "posts.score",
      "posts.state",
      "posts.created_at",
      "posts.promoted_at",
      "posts.hot_rank",
      "users.handle as author_handle",
      "users.kind as author_kind",
      "communities.slug as community_slug",
      "communities.name as community_name",
      "communities.default_mode as community_mode",
      "titles.id as title_id",
      "titles.kind as title_kind",
      "titles.canonical_name",
      "titles.poster_url",
      "titles.runtime_s",
      "titles.year",
      "s.platform",
      "s.external_id",
      "s.url as source_url",
      "s.embeddable",
      "s.start_seconds",
      sql<string[] | null>`(
        select array_agg(tt.tag order by tt.tag)
        from title_tags tt
        where tt.title_id = titles.id
      )`.as("tags"),
      eb
        .selectFrom("comments")
        .select(sql<number>`count(*)::int`.as("c"))
        .whereRef("comments.post_id", "=", "posts.id")
        .where("comments.removed_at", "is", null)
        .as("comment_count"),
      query.viewerId
        ? eb
            .selectFrom("votes")
            .select("votes.value")
            .whereRef("votes.post_id", "=", "posts.id")
            .where("votes.user_id", "=", query.viewerId)
            .as("viewer_vote")
        : sql<number | null>`null`.as("viewer_vote"),
    ])
    .where("posts.state", "=", surface);

  if (query.communitySlug) {
    q = q.where("communities.slug", "=", query.communitySlug);
  }

  if (query.tag) {
    q = q.where((eb) =>
      eb.exists(
        eb
          .selectFrom("title_tags")
          .select("title_tags.tag")
          .whereRef("title_tags.title_id", "=", "titles.id")
          .where("title_tags.tag", "=", query.tag!),
      ),
    );
  }

  if (cursor) {
    // Strictly after the cursor in (sortValue desc, id desc) order.
    q = q.where((eb) =>
      eb.or([
        eb(sql.ref(sortColumn), "<", cursor.value),
        eb.and([
          eb(sql.ref(sortColumn), "=", cursor.value),
          eb("posts.id", "<", cursor.id),
        ]),
      ]),
    );
  }

  const rows = await q
    .orderBy(sql.ref(sortColumn), "desc")
    .orderBy("posts.id", "desc")
    .limit(limit + 1)
    .execute();

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items: FeedItem[] = page.map((r) => ({
    postId: r.post_id,
    headline: r.headline,
    body: r.body,
    score: r.score,
    state: r.state,
    createdAt: new Date(r.created_at as unknown as string),
    promotedAt: r.promoted_at
      ? new Date(r.promoted_at as unknown as string)
      : null,
    commentCount: Number(r.comment_count ?? 0),
    author: { handle: r.author_handle, kind: r.author_kind },
    community: {
      slug: r.community_slug,
      name: r.community_name,
      defaultMode: r.community_mode,
    },
    title: {
      id: r.title_id,
      kind: r.title_kind,
      canonicalName: r.canonical_name,
      posterUrl: r.poster_url,
      runtimeSeconds: r.runtime_s,
      year: r.year,
      tags: r.tags ?? [],
    },
    source: r.platform
      ? {
          platform: r.platform,
          externalId: r.external_id!,
          url: r.source_url!,
          embeddable: r.embeddable!,
          startSeconds: r.start_seconds,
        }
      : null,
    viewerVote: (r.viewer_vote as 1 | -1 | null) ?? null,
  }));

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          value:
            sort === "hot"
              ? last.hot_rank
              : sort === "top"
                ? last.score
                : last.post_id,
          id: last.post_id,
        })
      : null;

  return { items, nextCursor };
}

/**
 * How a feed item should render (plan §2b). Watch mode is the embeddable,
 * consume-now card; queue mode is poster art and where-to-watch for things
 * you decide about now and watch later.
 */
export function cardMode(item: FeedItem): FeedMode {
  if (item.source?.embeddable) return "watch";
  return "queue";
}
