import { parseTimestamp, type ResolvedSource, type Resolver } from "./types";

const VOD_ID = /^\d{8,12}$/;
const CLIP_SLUG = /^[A-Za-z0-9_-]{6,120}$/;

/**
 * Twitch VODs and clips only.
 *
 * A bare channel URL (twitch.tv/<name>) resolves to whatever happens to be
 * live right now, which is not a durable catalog entity — the Title it would
 * create points at different content every day. Rejected on purpose.
 */
export const twitch: Resolver = {
  platform: "twitch",
  hosts: ["twitch.tv", "clips.twitch.tv", "m.twitch.tv"],

  resolve(url: URL): ResolvedSource | null {
    const host = url.hostname.replace(/^www\./, "");
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    const startSeconds = parseTimestamp(url.searchParams.get("t"));

    if (host === "clips.twitch.tv") {
      const slug = segments[0]!;
      if (!CLIP_SLUG.test(slug)) return null;
      return {
        platform: "twitch",
        externalId: `clip:${slug}`,
        canonicalUrl: `https://clips.twitch.tv/${slug}`,
        embeddable: true,
        thumbnailUrl: null,
        startSeconds: null,
      };
    }

    // twitch.tv/videos/<id>
    if (segments[0] === "videos") {
      const id = segments[1];
      if (!id || !VOD_ID.test(id)) return null;
      return {
        platform: "twitch",
        externalId: `video:${id}`,
        canonicalUrl: `https://www.twitch.tv/videos/${id}`,
        embeddable: true,
        thumbnailUrl: null,
        startSeconds,
      };
    }

    // twitch.tv/<channel>/clip/<slug>
    if (segments[1] === "clip") {
      const slug = segments[2];
      if (!slug || !CLIP_SLUG.test(slug)) return null;
      return {
        platform: "twitch",
        externalId: `clip:${slug}`,
        canonicalUrl: `https://clips.twitch.tv/${slug}`,
        embeddable: true,
        thumbnailUrl: null,
        startSeconds: null,
      };
    }

    return null;
  },
};
