import type { DbPlatform, TitleKind } from "@/lib/db/types";

/**
 * Enrichment providers.
 *
 * A submitted URL tells us where a video lives, not what it is. Providers
 * resolve the difference: real title, creator, runtime, genre.
 *
 * Two shapes, because the two halves of the catalog are reached differently:
 *
 *   source  — a Title with a playable URL. Resolved by asking the platform
 *             (oEmbed). Covers watch mode.
 *   catalog — a film or series with no source yet. Resolved by name and
 *             year against an open dataset. Covers queue mode.
 *
 * Providers also declare a licence class, because licences have
 * architectural consequences. Everything shipped here is `open`: Wikidata is
 * CC0 and oEmbed is public. The `licensed` class exists so that if a
 * commercial source is ever added, its cache limit is enforced structurally
 * rather than remembered.
 */

export type LicenceClass =
  /** Public or CC0. No key, no agreement, no cache limit, no attribution. */
  | "open"
  /** Requires a commercial agreement and expires cached data. */
  | "licensed";

export type EnrichmentTarget =
  | {
      kind: "source";
      platform: DbPlatform;
      externalId: string;
      url: string;
    }
  | {
      kind: "catalog";
      name: string;
      year: number | null;
      titleKind: TitleKind;
    };

export interface EnrichmentResult {
  /** The work's real name, replacing the submitter's placeholder headline. */
  canonicalName?: string;
  creatorName?: string;
  runtimeSeconds?: number;
  posterUrl?: string;
  year?: number;
  description?: string;
  width?: number;
  height?: number;
  /** Facet tag slugs inferred from the source's own genre vocabulary. */
  tags?: string[];
  externalIds?: {
    wikidata?: string;
    imdb?: string;
  };
}

export interface EnrichmentProvider {
  name: string;
  licence: LicenceClass;
  /** Which half of the catalog this provider serves. */
  accepts: EnrichmentTarget["kind"];
  /** Platforms handled, for source providers. Empty for catalog providers. */
  platforms: readonly DbPlatform[];
  /**
   * How long results may be retained. Null means indefinitely, which is the
   * case for every provider shipped today.
   */
  cacheTtlDays: number | null;
  /** Resolve, or null when the provider has nothing (deleted, private, 404). */
  fetch(target: EnrichmentTarget): Promise<EnrichmentResult | null>;
}

/** Thrown for transient failures worth retrying, as opposed to a hard miss. */
export class TransientEnrichmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransientEnrichmentError";
  }
}
