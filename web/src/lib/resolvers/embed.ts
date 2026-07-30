import type { DbPlatform } from "@/lib/db/types";

/**
 * Build a player URL for an embeddable source.
 *
 * Returns null for platforms we can only link out to (plan §3/P2) — Netflix
 * and friends have no embed, and pretending otherwise produces a dead frame.
 */
export function embedUrl(
  platform: DbPlatform,
  externalId: string,
  startSeconds?: number | null,
): string | null {
  const start = startSeconds && startSeconds > 0 ? startSeconds : null;

  switch (platform) {
    case "youtube": {
      const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
      if (start) params.set("start", String(start));
      return `https://www.youtube-nocookie.com/embed/${externalId}?${params}`;
    }
    case "vimeo": {
      // Unlisted videos carry `id:hash`; the hash becomes the `h` parameter.
      const [id, hash] = externalId.split(":");
      const params = new URLSearchParams();
      if (hash) params.set("h", hash);
      if (start) params.set("#t", `${start}s`);
      const qs = params.toString();
      return `https://player.vimeo.com/video/${id}${qs ? `?${qs}` : ""}`;
    }
    case "twitch": {
      const [kind, id] = externalId.split(":");
      // Twitch requires the embedding host to be declared.
      const parent = process.env.NEXT_PUBLIC_TWITCH_PARENT ?? "localhost";
      if (kind === "clip") {
        return `https://clips.twitch.tv/embed?clip=${id}&parent=${parent}`;
      }
      const t = start ? `&time=${start}s` : "";
      return `https://player.twitch.tv/?video=${id}&parent=${parent}${t}`;
    }
    case "streamable":
      return `https://streamable.com/e/${externalId}`;
    case "dailymotion": {
      const params = new URLSearchParams();
      if (start) params.set("start", String(start));
      const qs = params.toString();
      return `https://www.dailymotion.com/embed/video/${externalId}${qs ? `?${qs}` : ""}`;
    }
    default:
      return null;
  }
}
