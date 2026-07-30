import type { DbPlatform } from "@/lib/db/types";
import {
  type EnrichmentProvider,
  type EnrichmentResult,
  TransientEnrichmentError,
} from "./types";

/**
 * oEmbed enrichment.
 *
 * Public endpoints: no API key, no commercial agreement, no cache limit. This
 * is what makes watch-mode enrichment possible today while the TMDB question
 * (which needs a written agreement) is still open.
 *
 * oEmbed gives title, author, and thumbnail everywhere, plus duration from
 * Vimeo and Dailymotion. YouTube's oEmbed omits duration — that needs the
 * Data API and its quota, so runtime stays null for YouTube until then.
 */

const TIMEOUT_MS = 8000;
const USER_AGENT = "Vumble/1.0 (+https://vumble.com)";

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  duration?: number;
  width?: number;
  height?: number;
  upload_date?: string;
}

async function fetchOEmbed(endpoint: string): Promise<OEmbedResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": USER_AGENT },
    });

    // 404 and 403 are real answers: the video is gone, private, or has
    // embedding disabled. Retrying will not change that.
    if (res.status === 404 || res.status === 401 || res.status === 403) {
      return null;
    }
    if (!res.ok) {
      throw new TransientEnrichmentError(
        `oEmbed responded ${res.status}`,
      );
    }

    return (await res.json()) as OEmbedResponse;
  } catch (err) {
    if (err instanceof TransientEnrichmentError) throw err;
    // Timeouts and network failures are worth retrying.
    throw new TransientEnrichmentError(
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Platforms put their own name in the oEmbed title when they have nothing
 * better. Keeping those would leave every card reading "Video".
 */
function usableTitle(title: string | undefined): string | undefined {
  if (!title) return undefined;
  const trimmed = title.trim();
  if (!trimmed) return undefined;
  if (/^(video|untitled|unknown)$/i.test(trimmed)) return undefined;
  return trimmed;
}

function toResult(data: OEmbedResponse): EnrichmentResult | null {
  const canonicalName = usableTitle(data.title);
  const result: EnrichmentResult = {};

  if (canonicalName) result.canonicalName = canonicalName;
  if (data.author_name?.trim()) result.creatorName = data.author_name.trim();
  if (data.thumbnail_url) result.posterUrl = data.thumbnail_url;
  if (typeof data.duration === "number" && data.duration > 0) {
    result.runtimeSeconds = Math.round(data.duration);
  }
  if (typeof data.width === "number" && data.width > 0) result.width = data.width;
  if (typeof data.height === "number" && data.height > 0) {
    result.height = data.height;
  }

  if (data.upload_date) {
    const year = Number(data.upload_date.slice(0, 4));
    if (Number.isInteger(year) && year >= 1888) result.year = year;
  }

  // Nothing usable came back; treat it as a miss rather than marking the
  // Title enriched with an empty payload.
  return Object.keys(result).length > 0 ? result : null;
}

function makeProvider(
  name: string,
  platform: DbPlatform,
  endpoint: (url: string) => string,
): EnrichmentProvider {
  return {
    name,
    licence: "open",
    platforms: [platform],
    cacheTtlDays: null,
    async fetch(source) {
      const data = await fetchOEmbed(endpoint(source.url));
      return data ? toResult(data) : null;
    },
  };
}

export const youtubeOEmbed = makeProvider(
  "youtube-oembed",
  "youtube",
  (url) =>
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
);

export const vimeoOEmbed = makeProvider(
  "vimeo-oembed",
  "vimeo",
  (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
);

export const dailymotionOEmbed = makeProvider(
  "dailymotion-oembed",
  "dailymotion",
  (url) =>
    `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(url)}&format=json`,
);

export const OEMBED_PROVIDERS: readonly EnrichmentProvider[] = [
  youtubeOEmbed,
  vimeoOEmbed,
  dailymotionOEmbed,
];

/** Exported for tests. */
export const __internals = { toResult, usableTitle };
