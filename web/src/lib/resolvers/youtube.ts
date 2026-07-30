import { parseTimestamp, type ResolvedSource, type Resolver } from "./types";

/** YouTube IDs are exactly 11 chars of base64url. */
const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Path prefixes that are never a single video. V1 tried to filter these
 * (Player.js:657) but the check was written as
 *
 *   domain === "youtube.com" | domain === "youtu.be" |
 *   domain === "m.youtube.com" && !url.includes('/channel/') && ...
 *
 * Bitwise `|` plus `&&` precedence meant the guards bound only to the final
 * comparison, so channel and playlist URLs slipped through from youtube.com
 * and youtu.be. Resolving by path segment removes the class of bug.
 */
const NON_VIDEO = new Set([
  "channel",
  "playlist",
  "playlists",
  "user",
  "c",
  "results",
  "feed",
  "hashtag",
]);

/** Path segments that carry the video ID in the *next* segment. */
const ID_BEARING = new Set(["embed", "shorts", "live", "v", "e"]);

export const youtube: Resolver = {
  platform: "youtube",
  hosts: ["youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"],

  resolve(url: URL): ResolvedSource | null {
    const segments = url.pathname.split("/").filter(Boolean);
    const host = url.hostname.replace(/^www\./, "");

    let id: string | null = null;

    if (host === "youtu.be") {
      // youtu.be/<id>
      id = segments[0] ?? null;
    } else if (segments.length === 0) {
      // youtube.com/watch?v=<id>
      id = url.searchParams.get("v");
    } else {
      const head = segments[0]!;
      if (head.startsWith("@") || NON_VIDEO.has(head)) return null;

      if (ID_BEARING.has(head)) {
        id = segments[1] ?? null;
      } else if (head === "watch") {
        id = url.searchParams.get("v");
      } else {
        return null;
      }
    }

    if (!id || !ID.test(id)) return null;

    // A playlist URL that also names a video is still a video submission,
    // but we drop the list context — the Title is the video, not the list.
    const startSeconds =
      parseTimestamp(url.searchParams.get("t")) ??
      parseTimestamp(url.hash.replace(/^#t=/, "") || null);

    return {
      platform: "youtube",
      externalId: id,
      canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      embeddable: true,
      // V1 preferred Reddit's cached preview and fell back to hqdefault
      // (Player.js:674-678). With no Reddit envelope, hqdefault is the
      // only zero-network option; enrichment upgrades it later (plan §7).
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      startSeconds,
    };
  },
};
