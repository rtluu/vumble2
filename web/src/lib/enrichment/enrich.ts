import type { Db } from "@/lib/db/client";
import type { DbPlatform } from "@/lib/db/types";
import { OEMBED_PROVIDERS } from "./oembed";
import {
  type EnrichmentProvider,
  TransientEnrichmentError,
} from "./types";

/**
 * The enrichment runner.
 *
 * Best-effort by construction: a Title that cannot be enriched keeps the
 * submitter's headline as its name and stays perfectly usable. Nothing here
 * is allowed to break a post.
 */

/** Give up after this many consecutive failures; the URL is probably dead. */
const MAX_FAILURES = 5;

const PROVIDERS: readonly EnrichmentProvider[] = [...OEMBED_PROVIDERS];

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

export type EnrichOutcome =
  | { status: "enriched"; provider: string; fields: string[] }
  | { status: "no_provider" }
  | { status: "no_source" }
  | { status: "miss" }
  | { status: "retry_later"; message: string };

export async function enrichTitle(
  db: Db,
  titleId: number,
  providers: readonly EnrichmentProvider[] = PROVIDERS,
): Promise<EnrichOutcome> {
  const source = await db
    .selectFrom("sources")
    .select(["platform", "external_id", "url"])
    .where("title_id", "=", titleId)
    // Prefer an embeddable source, then the earliest — same rule the feed
    // uses to pick which source to render, so they never disagree.
    .orderBy("embeddable", "desc")
    .orderBy("id", "asc")
    .executeTakeFirst();

  // Catalog Titles (films, series) have no source until where-to-watch is
  // resolved. Nothing to enrich from yet — not an error.
  if (!source) return { status: "no_source" };

  const provider = providers.find((p) => p.platforms.includes(source.platform));
  if (!provider) return { status: "no_provider" };

  let result;
  try {
    result = await provider.fetch({
      platform: source.platform,
      externalId: source.external_id,
      url: source.url,
    });
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
  });

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
  options: { limit?: number; providers?: readonly EnrichmentProvider[] } = {},
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
    const outcome = await enrichTitle(db, row.id, options.providers);
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
