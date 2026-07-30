import type { Db } from "@/lib/db/client";
import type { DbPlatform } from "@/lib/db/types";
import { OEMBED_PROVIDERS } from "./oembed";
import {
  type EnrichmentProvider,
  type EnrichmentTarget,
  TransientEnrichmentError,
} from "./types";
import { findTrailer } from "./trailer";
import { wikidata } from "./wikidata";

/**
 * The enrichment runner.
 *
 * Best-effort by construction: a Title that cannot be enriched keeps the
 * submitter's headline as its name and stays perfectly usable. Nothing here
 * is allowed to break a post.
 */

/** Give up after this many consecutive failures; the URL is probably dead. */
const MAX_FAILURES = 5;

const PROVIDERS: readonly EnrichmentProvider[] = [...OEMBED_PROVIDERS, wikidata];

const BY_PLATFORM = new Map<DbPlatform, EnrichmentProvider>();
for (const provider of PROVIDERS) {
  for (const platform of provider.platforms) {
    if (!BY_PLATFORM.has(platform)) BY_PLATFORM.set(platform, provider);
  }
}

export function providerFor(
  platform: DbPlatform,
): EnrichmentProvider | null {
  return BY_PLATFORM.get(platform) ?? null;
}

/** Injectable so tests never reach the network. */
export type TrailerLookup = typeof findTrailer;

/**
 * Attach a trailer to a catalog Title, if one can be found and trusted.
 *
 * Entirely best-effort: a Title without a trailer is still perfectly usable,
 * so every failure here is swallowed. Returns the provenance when one was
 * attached, so the caller can report how much to trust it.
 */
export async function attachTrailer(
  db: Db,
  titleId: number,
  input: {
    name: string;
    year: number | null;
    wikidataVideoId?: string | null;
    lookup?: TrailerLookup;
  },
): Promise<string | null> {
  const existing = await db
    .selectFrom("sources")
    .select("id")
    .where("title_id", "=", titleId)
    .where("role", "=", "trailer")
    .executeTakeFirst();
  if (existing) return null;

  let candidate;
  try {
    candidate = await (input.lookup ?? findTrailer)(
      { name: input.name, year: input.year },
      {
        wikidataVideoId: input.wikidataVideoId,
        apiKey: process.env.YOUTUBE_API_KEY,
      },
    );
  } catch {
    return null;
  }
  if (!candidate) return null;

  try {
    await db
      .insertInto("sources")
      .values({
        title_id: titleId,
        role: "trailer",
        platform: "youtube",
        external_id: candidate.videoId,
        url: `https://www.youtube.com/watch?v=${candidate.videoId}`,
        embeddable: true,
        provenance: candidate.provenance,
      })
      // The same video can already exist as some other Title's source; the
      // (platform, external_id) key makes that a conflict rather than a
      // duplicate, and a missing trailer is not worth failing enrichment for.
      .onConflict((oc) => oc.doNothing())
      .execute();
  } catch {
    return null;
  }

  return candidate.provenance;
}

export type EnrichOutcome =
  | { status: "enriched"; provider: string; fields: string[] }
  | { status: "no_provider" }
  | { status: "miss" }
  | { status: "retry_later"; message: string };

export async function enrichTitle(
  db: Db,
  titleId: number,
  providers: readonly EnrichmentProvider[] = PROVIDERS,
  trailerLookup?: TrailerLookup,
): Promise<EnrichOutcome> {
  const title = await db
    .selectFrom("titles")
    .select(["canonical_name", "year", "kind", "enriched_at"])
    .where("id", "=", titleId)
    .executeTakeFirstOrThrow();

  const source = await db
    .selectFrom("sources")
    .select(["platform", "external_id", "url"])
    .where("title_id", "=", titleId)
    // Only the work itself. A trailer must not make a catalog Title look as
    // though it has something playable, or it would stop being enriched as a
    // catalog entry at all.
    .where("role", "=", "primary")
    // Prefer an embeddable source, then the earliest — same rule the feed
    // uses to pick which source to render, so they never disagree.
    .orderBy("embeddable", "desc")
    .orderBy("id", "asc")
    .executeTakeFirst();

  // A Title with a source is asked of the platform; one without (a film or
  // series entered into the catalog directly) is looked up by name and year
  // against Wikidata.
  const target: EnrichmentTarget = source
    ? {
        kind: "source",
        platform: source.platform,
        externalId: source.external_id,
        url: source.url,
      }
    : {
        kind: "catalog",
        name: title.canonical_name,
        year: title.year,
        titleKind: title.kind,
      };

  const provider = providers.find((p) =>
    target.kind === "source"
      ? p.accepts === "source" && p.platforms.includes(target.platform)
      : p.accepts === "catalog",
  );
  if (!provider) return { status: "no_provider" };

  let result;
  try {
    result = await provider.fetch(target);
  } catch (err) {
    if (err instanceof TransientEnrichmentError) {
      await db
        .updateTable("titles")
        .set((eb) => ({ enrichment_failures: eb("enrichment_failures", "+", 1) }))
        .where("id", "=", titleId)
        .execute();
      return { status: "retry_later", message: err.message };
    }
    throw err;
  }

  if (!result) {
    await db
      .updateTable("titles")
      .set((eb) => ({ enrichment_failures: eb("enrichment_failures", "+", 1) }))
      .where("id", "=", titleId)
      .execute();
    return { status: "miss" };
  }

  const now = new Date();
  const expiresAt =
    provider.cacheTtlDays === null
      ? null
      : new Date(now.getTime() + provider.cacheTtlDays * 86400 * 1000);

  const changes: Record<string, unknown> = {
    enriched_at: now,
    enrichment_provider: provider.name,
    enrichment_expires_at: expiresAt,
    enrichment_failures: 0,
  };
  const fields: string[] = [];

  if (result.canonicalName) {
    changes.canonical_name = result.canonicalName;
    fields.push("canonical_name");
  }
  if (result.runtimeSeconds) {
    changes.runtime_s = result.runtimeSeconds;
    fields.push("runtime_s");
  }
  if (result.posterUrl) {
    changes.poster_url = result.posterUrl;
    fields.push("poster_url");
  }
  if (result.year) {
    changes.year = result.year;
    fields.push("year");
  }
  if (result.description) {
    changes.description = result.description;
    fields.push("description");
  }
  if (result.externalIds?.wikidata) {
    changes.wikidata_id = result.externalIds.wikidata;
    fields.push("wikidata_id");
  }
  if (result.externalIds?.imdb) {
    changes.imdb_id = result.externalIds.imdb;
    fields.push("imdb_id");
  }

  await db.transaction().execute(async (trx) => {
    if (result.creatorName) {
      // Creators are shared across Titles, so find-or-create rather than
      // inserting a duplicate row per video.
      let creator = await trx
        .selectFrom("creators")
        .select("id")
        .where("name", "=", result.creatorName)
        .executeTakeFirst();

      if (!creator) {
        creator = await trx
          .insertInto("creators")
          .values({ name: result.creatorName })
          .returning("id")
          .executeTakeFirstOrThrow();
      }

      changes.creator_id = creator.id;
      fields.push("creator_id");
    }

    await trx
      .updateTable("titles")
      .set(changes)
      .where("id", "=", titleId)
      .execute();

    if (result.tags?.length) {
      // Provider genres are additive: they never remove a tag a human
      // applied, and the FK to the vocabulary means an unmapped genre is
      // rejected rather than silently inventing a tag.
      const known = await trx
        .selectFrom("tags")
        .select("slug")
        .where("slug", "in", result.tags)
        .execute();

      if (known.length > 0) {
        await trx
          .insertInto("title_tags")
          .values(
            known.map((t) => ({
              title_id: titleId,
              tag: t.slug,
              // Below a human's default 1.0, so hand-applied tags outrank
              // inferred ones wherever weight is used to rank.
              weight: 0.6,
            })),
          )
          .onConflict((oc) => oc.columns(["title_id", "tag"]).doNothing())
          .execute();
        fields.push(`tags(${known.length})`);
      }
    }
  });

  // Trailers apply only to catalog Titles. A Title that already has a
  // playable source does not need a preview of itself.
  if (target.kind === "catalog") {
    const attached = await attachTrailer(db, titleId, {
      name: result.canonicalName ?? target.name,
      year: result.year ?? target.year,
      wikidataVideoId: result.trailerVideoId ?? null,
      lookup: trailerLookup,
    });
    if (attached) fields.push(`trailer(${attached})`);
  }

  return { status: "enriched", provider: provider.name, fields };
}

export interface SweepSummary {
  considered: number;
  enriched: number;
  missed: number;
  deferred: number;
  skipped: number;
}

/**
 * Enrich everything that needs it.
 *
 * Two populations qualify: Titles never enriched, and Titles whose cached
 * data has passed the expiry its licence imposed. The second is why the
 * expiry column exists — refreshing on schedule is what keeps licensed data
 * inside its terms.
 */
export async function enrichPending(
  db: Db,
  options: {
    limit?: number;
    providers?: readonly EnrichmentProvider[];
    trailerLookup?: TrailerLookup;
  } = {},
): Promise<SweepSummary> {
  const limit = options.limit ?? 50;

  const rows = await db
    .selectFrom("titles")
    .select(["id"])
    .where((eb) =>
      eb.or([
        eb("enriched_at", "is", null),
        eb("enrichment_expires_at", "<=", new Date()),
      ]),
    )
    .where("enrichment_failures", "<", MAX_FAILURES)
    .orderBy("created_at", "asc")
    .limit(limit)
    .execute();

  const summary: SweepSummary = {
    considered: rows.length,
    enriched: 0,
    missed: 0,
    deferred: 0,
    skipped: 0,
  };

  for (const row of rows) {
    const outcome = await enrichTitle(
      db,
      row.id,
      options.providers,
      options.trailerLookup,
    );
    switch (outcome.status) {
      case "enriched":
        summary.enriched++;
        break;
      case "miss":
        summary.missed++;
        break;
      case "retry_later":
        summary.deferred++;
        break;
      default:
        summary.skipped++;
    }
  }

  return summary;
}

/**
 * Drop licensed data that has outlived its permitted cache window.
 *
 * Refreshing is the normal path; this is the backstop for when refresh has
 * been failing. Retaining licensed data past its window is a licence
 * violation, so expiry has to win over having something to display.
 */
export async function purgeExpiredLicensedData(db: Db): Promise<number> {
  const res = await db
    .updateTable("titles")
    .set({
      enriched_at: null,
      enrichment_provider: null,
      enrichment_expires_at: null,
      poster_url: null,
      description: "",
    })
    .where("enrichment_expires_at", "<=", new Date())
    .where("enrichment_failures", ">=", MAX_FAILURES)
    .executeTakeFirst();

  return Number(res.numUpdatedRows ?? 0);
}
