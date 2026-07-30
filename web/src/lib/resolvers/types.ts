/**
 * A resolver turns a user-submitted URL into a canonical, playable reference.
 *
 * This is the V2 form of the normalization that lived in the V1 `Player`
 * constructor (src/Components/Player.js). The logic is the same problem —
 * "what is this URL, and how do I play it?" — but keyed on the URL itself
 * rather than on a Reddit post envelope.
 */

export type Platform =
  | "youtube"
  | "vimeo"
  | "twitch"
  | "streamable"
  | "dailymotion";

/** Where a resolved source can be watched, and whether we may embed it. */
export interface ResolvedSource {
  platform: Platform;
  /** Platform-native ID. Unique per platform; forms half of the dedup key. */
  externalId: string;
  /** Normalized URL we store and link out to. */
  canonicalUrl: string;
  /**
   * Whether the platform permits iframe embedding. Non-embeddable sources
   * (Netflix, Max, et al — plan §3/P2) never reach a resolver; they arrive
   * as catalog Titles instead.
   */
  embeddable: boolean;
  /** Best-effort thumbnail derivable without a network call. */
  thumbnailUrl: string | null;
  /** Deep-link offset from a `?t=` / `#t=` fragment, if the submitter set one. */
  startSeconds: number | null;
}

export interface Resolver {
  platform: Platform;
  /** Hostnames this resolver claims, without a `www.` prefix. */
  hosts: readonly string[];
  resolve(url: URL): ResolvedSource | null;
}

/**
 * Parse the assorted timestamp forms platforms accept: `90`, `1m30s`, `1h2m3s`.
 * V1 stripped these off the ID and discarded them; a submission that points at
 * a specific moment is worth keeping.
 */
export function parseTimestamp(raw: string | null): number | null {
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return n > 0 ? n : null;
  }

  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;

  const total =
    Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return total > 0 ? total : null;
}
