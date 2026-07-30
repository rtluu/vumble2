import { dailymotion } from "./dailymotion";
import { streamable } from "./streamable";
import { twitch } from "./twitch";
import type { Platform, ResolvedSource, Resolver } from "./types";
import { vimeo } from "./vimeo";
import { youtube } from "./youtube";

export type { Platform, ResolvedSource, Resolver } from "./types";

const RESOLVERS: readonly Resolver[] = [
  youtube,
  vimeo,
  twitch,
  streamable,
  dailymotion,
];

/** hostname (no `www.`) → resolver */
const BY_HOST = new Map<string, Resolver>(
  RESOLVERS.flatMap((r) => r.hosts.map((h) => [h, r] as const)),
);

export function resolverFor(hostname: string): Resolver | null {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return BY_HOST.get(host) ?? null;
}

/**
 * Resolve a submitted URL to a canonical, playable source.
 *
 * Returns null when the URL is unparseable, not a known platform, or points
 * at something that is not a single video (a channel, a playlist, a live
 * stream). Callers treat null as "this is not an embeddable submission" —
 * it may still be a valid catalog Title, which is a separate lookup.
 */
export function resolve(input: string): ResolvedSource | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const resolver = resolverFor(url.hostname);
  if (!resolver) return null;

  return resolver.resolve(url);
}

/**
 * Stable dedup key for a resolved source. Two submissions producing the same
 * key are the same work and must collapse onto one Title (plan §2a).
 */
export function sourceKey(source: ResolvedSource): string {
  return `${source.platform}:${source.externalId}`;
}

export const SUPPORTED_PLATFORMS: readonly Platform[] = RESOLVERS.map(
  (r) => r.platform,
);
