import type { Db } from "@/lib/db/client";
import type { DbPlatform, TitleKind } from "@/lib/db/types";
import { resolve, type ResolvedSource } from "@/lib/resolvers";

/**
 * The submit pipeline: URL → canonical Title → Post.
 *
 * This is the spine of the platform (plan §2a). Every submission resolves to
 * a Title; the tenth person to submit a video joins the existing discussion
 * rather than forking it. Agents call the same path as humans — the only
 * difference is that their posts stay in `proposed` until humans promote
 * them (plan §7).
 */

export type SubmitFailure =
  | { ok: false; reason: "unresolvable"; message: string }
  | { ok: false; reason: "unknown_community"; message: string }
  | { ok: false; reason: "unknown_author"; message: string }
  | { ok: false; reason: "author_suspended"; message: string }
  | { ok: false; reason: "invalid_headline"; message: string }
  | {
      ok: false;
      reason: "already_posted";
      message: string;
      postId: number;
      titleId: number;
    };

export interface SubmitSuccess {
  ok: true;
  postId: number;
  titleId: number;
  /** True when the URL resolved onto a Title that already existed. */
  dedupedToExistingTitle: boolean;
  source: ResolvedSource;
}

export type SubmitResult = SubmitSuccess | SubmitFailure;

export interface SubmitInput {
  url: string;
  communitySlug: string;
  authorId: number;
  headline: string;
  body?: string;
}

const HEADLINE_MAX = 300;

/**
 * Clips are the only kind a URL resolver can produce. Films and series enter
 * the catalog through TMDB enrichment, not through a submitted embed URL
 * (plan §3/P2 — those platforms are link-out only).
 */
const RESOLVED_TITLE_KIND: TitleKind = "clip";

export async function submitUrl(
  db: Db,
  input: SubmitInput,
): Promise<SubmitResult> {
  const headline = input.headline.trim();
  if (headline.length === 0 || headline.length > HEADLINE_MAX) {
    return {
      ok: false,
      reason: "invalid_headline",
      message: `Headline must be 1-${HEADLINE_MAX} characters.`,
    };
  }

  const source = resolve(input.url);
  if (!source) {
    return {
      ok: false,
      reason: "unresolvable",
      message:
        "That URL is not a single video we can play. Channels, playlists, and live streams are not submittable.",
    };
  }

  const community = await db
    .selectFrom("communities")
    .select(["id"])
    .where("slug", "=", input.communitySlug)
    .executeTakeFirst();

  if (!community) {
    return {
      ok: false,
      reason: "unknown_community",
      message: `No community /v/${input.communitySlug}.`,
    };
  }

  const author = await db
    .selectFrom("users")
    .select(["id", "suspended_at"])
    .where("id", "=", input.authorId)
    .executeTakeFirst();

  if (!author) {
    return {
      ok: false,
      reason: "unknown_author",
      message: "Unknown author.",
    };
  }
  if (author.suspended_at !== null) {
    return {
      ok: false,
      reason: "author_suspended",
      message: "Suspended accounts cannot submit.",
    };
  }

  return db.transaction().execute(async (trx) => {
    // Dedup on (platform, external_id) — the same key sourceKey() builds.
    const existing = await trx
      .selectFrom("sources")
      .select(["title_id"])
      .where("platform", "=", source.platform as DbPlatform)
      .where("external_id", "=", source.externalId)
      .executeTakeFirst();

    let titleId: number;
    const dedupedToExistingTitle = existing !== undefined;

    if (existing) {
      titleId = existing.title_id;
    } else {
      const title = await trx
        .insertInto("titles")
        .values({
          kind: RESOLVED_TITLE_KIND,
          // Placeholder until enrichment resolves the real name (plan §7).
          // The headline is the submitter's framing, not the work's title.
          canonical_name: headline,
          poster_url: source.thumbnailUrl,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      titleId = title.id;

      await trx
        .insertInto("sources")
        .values({
          title_id: titleId,
          platform: source.platform as DbPlatform,
          external_id: source.externalId,
          url: source.canonicalUrl,
          embeddable: source.embeddable,
          start_seconds: source.startSeconds,
        })
        .execute();
    }

    // One Title per community. A collision is not an error the submitter
    // caused — it means the work is already here, so point them at it.
    const alreadyPosted = await trx
      .selectFrom("posts")
      .select(["id"])
      .where("community_id", "=", community.id)
      .where("title_id", "=", titleId)
      .where("state", "!=", "removed")
      .executeTakeFirst();

    if (alreadyPosted) {
      return {
        ok: false,
        reason: "already_posted",
        message: "Already posted to this community.",
        postId: alreadyPosted.id,
        titleId,
      } satisfies SubmitFailure;
    }

    const post = await trx
      .insertInto("posts")
      .values({
        title_id: titleId,
        community_id: community.id,
        author_id: input.authorId,
        headline,
        body: input.body ?? "",
        // Everything starts in the proposal queue — agents and new humans
        // alike. Humans confer legitimacy (plan §7).
        state: "proposed",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    return {
      ok: true,
      postId: post.id,
      titleId,
      dedupedToExistingTitle,
      source,
    } satisfies SubmitSuccess;
  });
}
