import { parseTimestamp, type ResolvedSource, type Resolver } from "./types";

const ID = /^\d{6,12}$/;

export const vimeo: Resolver = {
  platform: "vimeo",
  hosts: ["vimeo.com", "player.vimeo.com"],

  resolve(url: URL): ResolvedSource | null {
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    // player.vimeo.com/video/<id> and vimeo.com/<id>.
    // Unlisted videos carry a hash: vimeo.com/<id>/<hash> — the hash is
    // required for playback, so it belongs in the canonical URL.
    let id: string | null = null;
    let unlistedHash: string | null = null;

    if (segments[0] === "video") {
      id = segments[1] ?? null;
      unlistedHash = segments[2] ?? null;
    } else if (segments[0] === "channels" || segments[0] === "groups") {
      // vimeo.com/channels/<name>/<id>
      id = segments[segments.length - 1] ?? null;
    } else {
      id = segments[0]!;
      unlistedHash = segments[1] ?? null;
    }

    if (!id || !ID.test(id)) return null;
    if (unlistedHash && !/^[A-Za-z0-9]{6,16}$/.test(unlistedHash)) {
      unlistedHash = null;
    }

    return {
      platform: "vimeo",
      externalId: unlistedHash ? `${id}:${unlistedHash}` : id,
      canonicalUrl: unlistedHash
        ? `https://vimeo.com/${id}/${unlistedHash}`
        : `https://vimeo.com/${id}`,
      embeddable: true,
      // Vimeo thumbnails require an oEmbed call — enrichment fills this in.
      thumbnailUrl: null,
      startSeconds: parseTimestamp(url.hash.replace(/^#t=/, "") || null),
    };
  },
};
