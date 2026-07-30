import { describe, expect, it } from "vitest";
import { resolve, sourceKey } from "./index";
import { parseTimestamp } from "./types";

describe("youtube", () => {
  it("resolves every URL shape V1 handled", () => {
    const shapes = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ];
    for (const url of shapes) {
      const got = resolve(url);
      expect(got, url).not.toBeNull();
      expect(got!.externalId, url).toBe("dQw4w9WgXcQ");
      expect(got!.canonicalUrl, url).toBe(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      );
    }
  });

  it("resolves shapes that postdate V1", () => {
    expect(resolve("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.externalId)
      .toBe("dQw4w9WgXcQ");
    expect(resolve("https://www.youtube.com/live/dQw4w9WgXcQ")?.externalId)
      .toBe("dQw4w9WgXcQ");
    expect(resolve("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")?.externalId)
      .toBe("dQw4w9WgXcQ");
  });

  it("strips trailing query junk that V1 split on by hand", () => {
    // V1 chopped at '&' and '?t' with string splits (Player.js:668-672).
    expect(
      resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc&index=2")
        ?.externalId,
    ).toBe("dQw4w9WgXcQ");
    expect(
      resolve("https://youtu.be/dQw4w9WgXcQ?t=43")?.externalId,
    ).toBe("dQw4w9WgXcQ");
  });

  it("captures the timestamp V1 discarded", () => {
    expect(resolve("https://youtu.be/dQw4w9WgXcQ?t=43")?.startSeconds).toBe(43);
    expect(
      resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s")?.startSeconds,
    ).toBe(90);
    expect(resolve("https://youtu.be/dQw4w9WgXcQ")?.startSeconds).toBeNull();
  });

  /**
   * V1's guard was `domain === "youtube.com" | domain === "youtu.be" |
   * domain === "m.youtube.com" && !url.includes('/channel/') && ...`.
   * Bitwise `|` plus `&&` precedence bound the guards to the last comparison
   * only, so these slipped through from youtube.com and youtu.be.
   */
  it("rejects non-video URLs from every host (V1 leaked these)", () => {
    const rejected = [
      "https://www.youtube.com/channel/UCabc123",
      "https://www.youtube.com/playlist?list=PLabc123",
      "https://www.youtube.com/user/someuser",
      "https://www.youtube.com/c/somechannel",
      "https://www.youtube.com/@somehandle",
      "https://www.youtube.com/results?search_query=cats",
      "https://www.youtube.com/feed/subscriptions",
    ];
    for (const url of rejected) {
      expect(resolve(url), url).toBeNull();
    }
  });

  it("rejects malformed IDs", () => {
    expect(resolve("https://youtu.be/tooshort")).toBeNull();
    expect(resolve("https://www.youtube.com/watch?v=way_too_long_to_be_real")).toBeNull();
    expect(resolve("https://www.youtube.com/watch")).toBeNull();
    expect(resolve("https://youtu.be/bad!chars!!")).toBeNull();
  });
});

describe("vimeo", () => {
  it("resolves bare and player URLs", () => {
    expect(resolve("https://vimeo.com/123456789")?.externalId).toBe("123456789");
    expect(resolve("https://player.vimeo.com/video/123456789")?.externalId)
      .toBe("123456789");
    expect(resolve("https://vimeo.com/channels/staffpicks/123456789")?.externalId)
      .toBe("123456789");
  });

  it("keeps the unlisted hash, which playback requires", () => {
    const got = resolve("https://vimeo.com/123456789/abc123def4");
    expect(got?.externalId).toBe("123456789:abc123def4");
    expect(got?.canonicalUrl).toBe("https://vimeo.com/123456789/abc123def4");
  });

  it("rejects non-numeric paths", () => {
    expect(resolve("https://vimeo.com/somechannel")).toBeNull();
  });
});

describe("twitch", () => {
  it("resolves VODs and both clip URL shapes", () => {
    expect(resolve("https://www.twitch.tv/videos/123456789")?.externalId)
      .toBe("video:123456789");
    expect(resolve("https://clips.twitch.tv/SomeClipSlug")?.externalId)
      .toBe("clip:SomeClipSlug");
    // Both clip shapes must collapse to one key — same clip, one Title.
    expect(resolve("https://www.twitch.tv/somechannel/clip/SomeClipSlug")?.externalId)
      .toBe("clip:SomeClipSlug");
  });

  it("rejects bare channel URLs (not a durable entity)", () => {
    expect(resolve("https://www.twitch.tv/somechannel")).toBeNull();
  });
});

describe("streamable + dailymotion", () => {
  it("resolves streamable", () => {
    expect(resolve("https://streamable.com/abc12")?.externalId).toBe("abc12");
    expect(resolve("https://streamable.com/e/abc12")?.externalId).toBe("abc12");
  });

  it("resolves dailymotion and strips the title slug", () => {
    expect(resolve("https://www.dailymotion.com/video/x8abcd")?.externalId)
      .toBe("x8abcd");
    expect(resolve("https://www.dailymotion.com/video/x8abcd_some-title")?.externalId)
      .toBe("x8abcd");
    expect(resolve("https://dai.ly/x8abcd")?.externalId).toBe("x8abcd");
  });
});

describe("resolve()", () => {
  it("returns null for junk and unknown platforms", () => {
    for (const bad of ["", "   ", "not a url", "ftp://x.com/v", "https://netflix.com/title/80100172"]) {
      expect(resolve(bad), bad).toBeNull();
    }
  });

  it("does not resolve gfycat — shut down in 2023", () => {
    expect(resolve("https://gfycat.com/somegfyname")).toBeNull();
  });

  it("tolerates whitespace and case in the host", () => {
    expect(resolve("  https://WWW.YouTube.com/watch?v=dQw4w9WgXcQ  ")?.externalId)
      .toBe("dQw4w9WgXcQ");
  });
});

describe("sourceKey", () => {
  it("collapses equivalent URLs onto one dedup key", () => {
    const a = resolve("https://youtu.be/dQw4w9WgXcQ?t=10")!;
    const b = resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLx")!;
    expect(sourceKey(a)).toBe(sourceKey(b));
    expect(sourceKey(a)).toBe("youtube:dQw4w9WgXcQ");
  });
});

describe("parseTimestamp", () => {
  it("parses the forms platforms accept", () => {
    expect(parseTimestamp("90")).toBe(90);
    expect(parseTimestamp("1m30s")).toBe(90);
    expect(parseTimestamp("1h2m3s")).toBe(3723);
    expect(parseTimestamp("2h")).toBe(7200);
  });

  it("rejects zero, empty, and nonsense", () => {
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("0")).toBeNull();
    expect(parseTimestamp("abc")).toBeNull();
  });
});
