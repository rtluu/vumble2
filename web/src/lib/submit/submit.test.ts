import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "@/lib/db/client";
import { submitUrl } from "./submit";
import { castVote, retractVote } from "./vote";

let db: Db;
let alice: number;
let bob: number;
let carol: number;
let scoutBot: number;

const YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

async function mkUser(handle: string, kind: "human" | "agent" = "human") {
  const row = await db
    .insertInto("users")
    .values({
      handle,
      email: kind === "human" ? `${handle}@example.test` : null,
      kind,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

beforeEach(async () => {
  db = await createTestDb();

  await db
    .insertInto("communities")
    .values([
      { slug: "documentaries", name: "Documentaries", promote_threshold: 3 },
      { slug: "videoessays", name: "Video Essays", promote_threshold: 2 },
    ])
    .execute();

  alice = await mkUser("alice");
  bob = await mkUser("bob");
  carol = await mkUser("carol");
  scoutBot = await mkUser("scout_bot", "agent");
}, 60_000);

describe("submitUrl", () => {
  it("creates a Title, a Source, and a proposed Post", async () => {
    const res = await submitUrl(db, {
      url: YT,
      communitySlug: "documentaries",
      authorId: alice,
      headline: "A remarkable film",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.dedupedToExistingTitle).toBe(false);

    const post = await db
      .selectFrom("posts")
      .selectAll()
      .where("id", "=", res.postId)
      .executeTakeFirstOrThrow();
    expect(post.state).toBe("proposed");
    expect(post.promoted_at).toBeNull();

    const source = await db
      .selectFrom("sources")
      .selectAll()
      .where("title_id", "=", res.titleId)
      .executeTakeFirstOrThrow();
    expect(source.platform).toBe("youtube");
    expect(source.external_id).toBe("dQw4w9WgXcQ");
    expect(source.embeddable).toBe(true);
  });

  it("persists the timestamp the resolver captured", async () => {
    const res = await submitUrl(db, {
      url: "https://youtu.be/dQw4w9WgXcQ?t=90",
      communitySlug: "documentaries",
      authorId: alice,
      headline: "Skip to the good bit",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const source = await db
      .selectFrom("sources")
      .select("start_seconds")
      .where("title_id", "=", res.titleId)
      .executeTakeFirstOrThrow();
    expect(source.start_seconds).toBe(90);
  });

  it("collapses different URL forms onto one Title", async () => {
    const first = await submitUrl(db, {
      url: YT,
      communitySlug: "documentaries",
      authorId: alice,
      headline: "First framing",
    });
    // Same video, different URL shape, different community.
    const second = await submitUrl(db, {
      url: "https://youtu.be/dQw4w9WgXcQ?t=12",
      communitySlug: "videoessays",
      authorId: bob,
      headline: "Second framing",
    });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(second.titleId).toBe(first.titleId);
    expect(second.dedupedToExistingTitle).toBe(true);
    expect(second.postId).not.toBe(first.postId);

    const titles = await db.selectFrom("titles").selectAll().execute();
    expect(titles).toHaveLength(1);
  });

  it("refuses a duplicate in the same community and points at the original", async () => {
    const first = await submitUrl(db, {
      url: YT,
      communitySlug: "documentaries",
      authorId: alice,
      headline: "First",
    });
    const dup = await submitUrl(db, {
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      communitySlug: "documentaries",
      authorId: bob,
      headline: "Reposting the same thing",
    });

    expect(first.ok).toBe(true);
    expect(dup.ok).toBe(false);
    if (dup.ok || dup.reason !== "already_posted") {
      throw new Error(`expected already_posted, got ${JSON.stringify(dup)}`);
    }
    if (!first.ok) return;
    expect(dup.postId).toBe(first.postId);
  });

  it("lets agents submit — they just land in the proposal queue", async () => {
    const res = await submitUrl(db, {
      url: YT,
      communitySlug: "documentaries",
      authorId: scoutBot,
      headline: "Found this",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const post = await db
      .selectFrom("posts")
      .select("state")
      .where("id", "=", res.postId)
      .executeTakeFirstOrThrow();
    expect(post.state).toBe("proposed");
  });

  it("rejects non-video URLs", async () => {
    for (const url of [
      "https://www.youtube.com/playlist?list=PLabc",
      "https://www.youtube.com/@somehandle",
      "https://www.twitch.tv/somechannel",
      "not a url",
    ]) {
      const res = await submitUrl(db, {
        url,
        communitySlug: "documentaries",
        authorId: alice,
        headline: "Nope",
      });
      expect(res.ok, url).toBe(false);
      if (!res.ok) expect(res.reason, url).toBe("unresolvable");
    }
  });

  it("validates community, author, suspension, and headline", async () => {
    const base = {
      url: YT,
      communitySlug: "documentaries",
      authorId: alice,
      headline: "Fine",
    };

    const noCommunity = await submitUrl(db, { ...base, communitySlug: "nope" });
    expect(noCommunity.ok).toBe(false);
    if (!noCommunity.ok) expect(noCommunity.reason).toBe("unknown_community");

    const noAuthor = await submitUrl(db, { ...base, authorId: 99999 });
    expect(noAuthor.ok).toBe(false);
    if (!noAuthor.ok) expect(noAuthor.reason).toBe("unknown_author");

    const blank = await submitUrl(db, { ...base, headline: "   " });
    expect(blank.ok).toBe(false);
    if (!blank.ok) expect(blank.reason).toBe("invalid_headline");

    const tooLong = await submitUrl(db, { ...base, headline: "x".repeat(301) });
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) expect(tooLong.reason).toBe("invalid_headline");

    await db
      .updateTable("users")
      .set({ suspended_at: new Date() })
      .where("id", "=", bob)
      .execute();
    const suspended = await submitUrl(db, { ...base, authorId: bob });
    expect(suspended.ok).toBe(false);
    if (!suspended.ok) expect(suspended.reason).toBe("author_suspended");
  });

  it("allows resubmission after removal", async () => {
    const first = await submitUrl(db, {
      url: YT,
      communitySlug: "documentaries",
      authorId: alice,
      headline: "First",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    await db
      .updateTable("posts")
      .set({ state: "removed" })
      .where("id", "=", first.postId)
      .execute();

    const again = await submitUrl(db, {
      url: YT,
      communitySlug: "documentaries",
      authorId: bob,
      headline: "Second attempt",
    });
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.titleId).toBe(first.titleId);
  });

  it("leaves nothing behind when the post fails", async () => {
    await submitUrl(db, {
      url: YT,
      communitySlug: "documentaries",
      authorId: alice,
      headline: "First",
    });
    const before = await db.selectFrom("titles").selectAll().execute();

    await submitUrl(db, {
      url: YT,
      communitySlug: "documentaries",
      authorId: bob,
      headline: "Duplicate",
    });
    const after = await db.selectFrom("titles").selectAll().execute();

    expect(after).toHaveLength(before.length);
  });
});

describe("castVote and the promotion gate", () => {
  async function proposePost(slug = "videoessays") {
    const res = await submitUrl(db, {
      url: YT,
      communitySlug: slug,
      authorId: alice,
      headline: "Worth your time",
    });
    if (!res.ok) throw new Error("setup failed");
    return res.postId;
  }

  it("promotes once human upvotes reach the threshold", async () => {
    const postId = await proposePost(); // videoessays: threshold 2

    const first = await castVote(db, { userId: bob, postId, value: 1 });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.promoted).toBe(false);
      expect(first.state).toBe("proposed");
      expect(first.score).toBe(1);
    }

    const second = await castVote(db, { userId: carol, postId, value: 1 });
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.promoted).toBe(true);
      expect(second.state).toBe("promoted");
      expect(second.score).toBe(2);
    }

    const post = await db
      .selectFrom("posts")
      .selectAll()
      .where("id", "=", postId)
      .executeTakeFirstOrThrow();
    expect(post.state).toBe("promoted");
    expect(post.promoted_at).not.toBeNull();
    expect(post.hot_rank).toBeGreaterThan(0);
  });

  it("does not promote on a threshold met only by counting downvotes", async () => {
    const postId = await proposePost();
    await castVote(db, { userId: bob, postId, value: 1 });
    await castVote(db, { userId: carol, postId, value: -1 });

    const post = await db
      .selectFrom("posts")
      .select(["state", "score"])
      .where("id", "=", postId)
      .executeTakeFirstOrThrow();
    expect(post.state).toBe("proposed");
    expect(post.score).toBe(0);
  });

  it("rejects agent votes at the database boundary", async () => {
    const postId = await proposePost();
    const res = await castVote(db, { userId: scoutBot, postId, value: 1 });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("agents_cannot_vote");

    const votes = await db.selectFrom("votes").selectAll().execute();
    expect(votes).toHaveLength(0);
  });

  it("is idempotent per user — one vote each, changeable", async () => {
    const postId = await proposePost();

    await castVote(db, { userId: bob, postId, value: 1 });
    await castVote(db, { userId: bob, postId, value: 1 });
    let post = await db
      .selectFrom("posts")
      .select("score")
      .where("id", "=", postId)
      .executeTakeFirstOrThrow();
    expect(post.score).toBe(1);

    await castVote(db, { userId: bob, postId, value: -1 });
    post = await db
      .selectFrom("posts")
      .select("score")
      .where("id", "=", postId)
      .executeTakeFirstOrThrow();
    expect(post.score).toBe(-1);

    const votes = await db.selectFrom("votes").selectAll().execute();
    expect(votes).toHaveLength(1);
  });

  it("keeps a promoted post promoted when a vote is retracted", async () => {
    const postId = await proposePost();
    await castVote(db, { userId: bob, postId, value: 1 });
    await castVote(db, { userId: carol, postId, value: 1 });

    const { score } = await retractVote(db, carol, postId);
    expect(score).toBe(1);

    const post = await db
      .selectFrom("posts")
      .select("state")
      .where("id", "=", postId)
      .executeTakeFirstOrThrow();
    expect(post.state).toBe("promoted");
  });

  it("refuses votes on unknown and removed posts", async () => {
    const unknown = await castVote(db, { userId: bob, postId: 99999, value: 1 });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.reason).toBe("unknown_post");

    const postId = await proposePost();
    await db
      .updateTable("posts")
      .set({ state: "removed" })
      .where("id", "=", postId)
      .execute();

    const removed = await castVote(db, { userId: bob, postId, value: 1 });
    expect(removed.ok).toBe(false);
    if (!removed.ok) expect(removed.reason).toBe("post_removed");
  });
});
