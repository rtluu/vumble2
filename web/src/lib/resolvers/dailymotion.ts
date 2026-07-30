import { parseTimestamp, type ResolvedSource, type Resolver } from "./types";

const ID = /^[a-z0-9]{6,12}$/i;

export const dailymotion: Resolver = {
  platform: "dailymotion",
  hosts: ["dailymotion.com", "dai.ly"],

  resolve(url: URL): ResolvedSource | null {
    const host = url.hostname.replace(/^www\./, "");
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    // dai.ly/<id> and dailymotion.com/video/<id>
    let id: string | null = null;
    if (host === "dai.ly") {
      id = segments[0]!;
    } else if (segments[0] === "video" || segments[0] === "embed") {
      id = segments[0] === "embed" ? (segments[2] ?? null) : (segments[1] ?? null);
    }

    if (!id) return null;
    // Dailymotion appends a slug: x8abcd_some-title
    const bare = id.split("_")[0]!;
    if (!ID.test(bare)) return null;

    return {
      platform: "dailymotion",
      externalId: bare,
      canonicalUrl: `https://www.dailymotion.com/video/${bare}`,
      embeddable: true,
      thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${bare}`,
      startSeconds: parseTimestamp(url.searchParams.get("start")),
    };
  },
};
