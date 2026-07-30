import { TransientEnrichmentError } from "./types";

/**
 * Finding a trailer for a catalog Title.
 *
 * A poster is a static image with a copyright problem; a trailer is an
 * embeddable video with none — embedding is what YouTube's player exists for,
 * and an official trailer is published to be embedded. It is also simply more
 * useful: you can watch thirty seconds and decide.
 *
 * Three sources, in descending order of trust:
 *
 *   1. Wikidata P1651 (YouTube video id). CC0 and authoritative when
 *      present, but only about 4% of films carry one.
 *   2. YouTube Data API, if `YOUTUBE_API_KEY` is set. Free tier, official,
 *      reliable. Not a commercial agreement — just a key.
 *   3. Piped, an open-source YouTube frontend with keyless public instances.
 *      Volunteer-run and frequently down, so instances are tried in turn and
 *      a total failure is simply "no trailer yet".
 *
 * Anything found by search is verified before use. Attaching the wrong
 * trailer is worse than attaching none, so a result that does not clearly
 * match the work is discarded.
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const TIMEOUT_MS = 10000;
const USER_AGENT = "Vumble/1.0 (https://vumble.com) trailer-lookup";

/**
 * Public Piped instances. Volunteer-run: expect any given one to be down.
 * Tried in order, first success wins.
 */
const PIPED_INSTANCES = [
  "https://api.piped.private.coffee",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
];

export type TrailerProvenance =
  | "wikidata-p1651"
  | "youtube-api"
  | "piped-search"
  | "human";

export interface TrailerCandidate {
  videoId: string;
  title: string;
  uploader?: string;
  provenance: TrailerProvenance;
}

/** Strip punctuation and case so titles compare on words, not typography. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Does this search result plausibly belong to this work?
 *
 * Deliberately strict. A search for "Arrival trailer" will happily return
 * reaction videos, fan edits, and unrelated films with the same word in the
 * title; showing one of those on the card is worse than showing nothing.
 */
export function verifyCandidate(
  candidate: { title: string; uploader?: string },
  work: { name: string; year: number | null },
): boolean {
  const title = normalise(candidate.title);
  const name = normalise(work.name);
  if (!title || !name) return false;

  // The work's name must appear as a contiguous run of words.
  if (!title.includes(name)) return false;

  // It must announce itself as a trailer or teaser.
  if (!/\b(trailer|teaser)\b/.test(title)) return false;

  // Reaction, breakdown, and fan content routinely match everything above.
  if (
    /\b(reaction|review|breakdown|explained|analysis|recap|fan made|fanmade|parody|concept|honest)\b/.test(
      title,
    )
  ) {
    return false;
  }

  // A year in the title that contradicts the work's is a different release —
  // a remake, or a re-release trailer for another film entirely.
  if (work.year) {
    const years = title.match(/\b(19|20)\d{2}\b/g) ?? [];
    if (years.length > 0 && !years.some((y) => Math.abs(Number(y) - work.year!) <= 1)) {
      return false;
    }
  }

  return true;
}

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": USER_AGENT },
    });
    if (!res.ok) throw new TransientEnrichmentError(`responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

interface PipedItem {
  url?: string;
  title?: string;
  uploaderName?: string;
  isShort?: boolean;
}

/** Pull the `v` parameter out of Piped's relative `/watch?v=…` links. */
function videoIdFromPipedUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = /[?&]v=([A-Za-z0-9_-]{11})/.exec(url);
  return match?.[1] ?? null;
}

export async function searchPiped(
  query: string,
  work: { name: string; year: number | null },
  instances: readonly string[] = PIPED_INSTANCES,
): Promise<TrailerCandidate | null> {
  for (const host of instances) {
    try {
      const data = (await getJson(
        `${host}/search?q=${encodeURIComponent(query)}&filter=videos`,
      )) as { items?: PipedItem[] };

      for (const item of data.items ?? []) {
        if (item.isShort) continue;
        const videoId = videoIdFromPipedUrl(item.url);
        if (!videoId || !YOUTUBE_ID.test(videoId)) continue;
        if (!item.title) continue;

        if (verifyCandidate({ title: item.title, uploader: item.uploaderName }, work)) {
          return {
            videoId,
            title: item.title,
            uploader: item.uploaderName,
            provenance: "piped-search",
          };
        }
      }
      // Instance answered and had nothing that verified — trying another
      // instance would only return the same YouTube results.
      return null;
    } catch {
      // Instance down or slow. Try the next.
    }
  }
  return null;
}

interface YouTubeSearchResponse {
  items?: {
    id?: { videoId?: string };
    snippet?: { title?: string; channelTitle?: string };
  }[];
}

export async function searchYouTubeApi(
  query: string,
  work: { name: string; year: number | null },
  apiKey: string,
): Promise<TrailerCandidate | null> {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    videoEmbeddable: "true",
    maxResults: "5",
    key: apiKey,
  });

  const data = (await getJson(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
  )) as YouTubeSearchResponse;

  for (const item of data.items ?? []) {
    const videoId = item.id?.videoId;
    const title = item.snippet?.title;
    if (!videoId || !YOUTUBE_ID.test(videoId) || !title) continue;

    if (verifyCandidate({ title, uploader: item.snippet?.channelTitle }, work)) {
      return {
        videoId,
        title,
        uploader: item.snippet?.channelTitle,
        provenance: "youtube-api",
      };
    }
  }
  return null;
}

/** Resolve a YouTube id to its real title, so a candidate can be checked. */
export async function titleOf(videoId: string): Promise<string | null> {
  try {
    const data = (await getJson(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
    )) as { title?: string };
    return data.title ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve a trailer.
 *
 * P1651 is checked first but *not* trusted blindly. The property is "YouTube
 * video ID", not "trailer": for Arrival and Ghost in the Shell it points at
 * the YouTube Movies listing — the paid full film. Embedding that behind a
 * "Trailer" label would show a purchase gate, so a P1651 id is resolved to
 * its real title and verified like any other candidate, falling through to
 * search when it turns out not to be a trailer at all.
 */
export async function findTrailer(
  work: { name: string; year: number | null },
  options: {
    wikidataVideoId?: string | null;
    apiKey?: string | undefined;
    instances?: readonly string[];
  } = {},
): Promise<TrailerCandidate | null> {
  if (options.wikidataVideoId && YOUTUBE_ID.test(options.wikidataVideoId)) {
    const actualTitle = await titleOf(options.wikidataVideoId);
    if (actualTitle && verifyCandidate({ title: actualTitle }, work)) {
      return {
        videoId: options.wikidataVideoId,
        title: actualTitle,
        provenance: "wikidata-p1651",
      };
    }
    // Not a trailer (usually the full film for rent). Fall through.
  }

  const query = work.year
    ? `${work.name} ${work.year} official trailer`
    : `${work.name} official trailer`;

  if (options.apiKey) {
    try {
      const viaApi = await searchYouTubeApi(query, work, options.apiKey);
      if (viaApi) return viaApi;
    } catch {
      // Quota exhausted or key rejected; fall through to the keyless path.
    }
  }

  return searchPiped(query, work, options.instances);
}
