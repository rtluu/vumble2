import type { DbPlatform } from "@/lib/db/types";

/**
 * Enrichment providers.
 *
 * A submitted URL tells us where a video lives, not what it is. Providers
 * resolve the difference: real title, creator, runtime, artwork.
 *
 * Providers are classified by licence because the licence has architectural
 * consequences. oEmbed is public and unrestricted. TMDB requires a written
 * commercial agreement and caps caching at six months, so anything sourced
 * from it must carry an expiry — see `cacheTtlDays`.
 */

export type LicenceClass =
  /** Public endpoint, no key, no agreement, no cache limit. */
  | "open"
  /** Requires a commercial agreement and expires cached data. */
  | "licensed";

export interface EnrichmentResult {
  /** The work's real name, replacing the submitter's placeholder headline. */
  canonicalName?: string;
  creatorName?: string;
  runtimeSeconds?: number;
  posterUrl?: string;
  year?: number;
  description?: string;
  /** Native dimensions, for the player's aspect handling. */
  width?: number;
  height?: number;
}

export interface EnrichmentProvider {
  name: string;
  licence: LicenceClass;
  /** Platforms this provider can enrich. */
  platforms: readonly DbPlatform[];
  /**
   * How long results may be retained. Null means indefinitely.
   * TMDB's terms make this 180; oEmbed providers leave it null.
   */
  cacheTtlDays: number | null;
  /** Resolve, or null when the provider has nothing (deleted, private, 404). */
  fetch(source: {
    platform: DbPlatform;
    externalId: string;
    url: string;
  }): Promise<EnrichmentResult | null>;
}

/** Thrown for transient failures worth retrying, as opposed to a hard miss. */
export class TransientEnrichmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransientEnrichmentError";
  }
}
