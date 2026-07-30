import { type ResolvedSource, type Resolver } from "./types";

const ID = /^[a-z0-9]{4,8}$/i;

/**
 * Ported from Player.js:763-779. V1 read the thumbnail out of Reddit's
 * `media.oembed` envelope and fell back to a placeholder image; without that
 * envelope the thumbnail comes from enrichment instead.
 *
 * Note: V1's sibling Gfycat branch (Player.js:727-762) is deliberately not
 * ported. Gfycat shut down in 2023 and every thumbs.gfycat.com URL it built
 * is dead.
 */
export const streamable: Resolver = {
  platform: "streamable",
  hosts: ["streamable.com"],

  resolve(url: URL): ResolvedSource | null {
    const segments = url.pathname.split("/").filter(Boolean);
    // streamable.com/<id> and streamable.com/e/<id>
    const id = segments[0] === "e" ? segments[1] : segments[0];
    if (!id || !ID.test(id)) return null;

    return {
      platform: "streamable",
      externalId: id,
      canonicalUrl: `https://streamable.com/${id}`,
      embeddable: true,
      thumbnailUrl: null,
      startSeconds: null,
    };
  },
};
