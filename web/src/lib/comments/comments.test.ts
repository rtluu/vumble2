import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "@/lib/db/client";
import {
  joinCommunity,
  getMembership,
  joinedSlugs,
  leaveCommunity,
  memberCounts,
} from "@/lib/community/membership";
import { submitUrl } from "@/lib/submit/submit";
import { addComment, getThread, MAX_DEPTH, voteComment } from "./comments";

let db: Db;
let alice: number;
let bob: number;
let scoutBot: number;
let postId: number;

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
      { slug: "horror", name: "Horror", promote_threshold: 2 },
      { slug: "scifi", name: "Science Fiction", promote_threshold: 2 },
    ])
    .execute();

  alice = await mkUser("alice");
  bob = await mkUser("bob");
  scoutBot = await mkUser("scout_bot", "agent");

  const res = await submitUrl(db, {
    url: "https://www.youtube.com/watch?v=aaaaaaaaaaa",
    communitySlug: "horror",
    authorId: alice,
    headline: "Discuss this",
  });
  if (!res.ok) throw new Error("setup failed");
  postId = res.postId;
}, 60_000);

describe("addComment", () => {
  it("creates a root comment with its id as the path", async () => {
    const res = await addComment(db, { postId, authorId: alice, body: "First" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.depth).toBe(1);

    const row = await db
      .selectFrom("comments")
      .select(["path", "body"])
      .where("id", "=", res.commentId)
      .executeTakeFirstOrThrow();
    expect(row.path).toBe(String(res.commentId));
  });

  it("nests a reply under its parent's path", async () => {
    const root = await addComment(db, { postId, authorId: alice, body: "Root" });
    if (!root.ok) throw new Error("setup");
    const reply = await addComment(db, {
      postId,
      authorId: bob,
      parentId: root.commentId,
      body: "Reply",
    });
    expect(reply.ok).toBe(true);
    if (!reply.ok) return;
    expect(reply.depth).toBe(2);

    const row = await db
      .selectFrom("comments")
      .select("path")
      .where("id", "=", reply.commentId)
      .executeTakeFirstOrThrow();
    expect(row.path).toBe(`${root.commentId}.${reply.commentId}`);
  });

  it("trims and rejects empty or oversized bodies", async () => {
    const empty = await addComment(db, { postId, authorId: alice, body: "   " });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toBe("empty_body");

    const huge = await addComment(db, {
      postId,
      authorId: alice,
      body: "x".repeat(10001),
    });
    expect(huge.ok).toBe(false);
    if (!huge.ok) expect(huge.reason).toBe("body_too_long");
  });

  it("refuses unknown posts, removed posts, and foreign parents", async () => {
    const unknown = await addComment(db, {
      postId: 99999,
      authorId: alice,
      body: "hi",
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.reason).toBe("unknown_post");

    // A parent belonging to a different post must not graft across threads.
    const other = await submitUrl(db, {
      url: "https://www.youtube.com/watch?v=bbbbbbbbbbb",
      communitySlug: "scifi",
      authorId: alice,
      headline: "Elsewhere",
    });
    if (!other.ok) throw new Error("setup");
    const foreign = await addComment(db, {
      postId: other.postId,
      authorId: alice,
      body: "root elsewhere",
    });
    if (!foreign.ok) throw new Error("setup");

    const grafted = await addComment(db, {
      postId,
      authorId: alice,
      parentId: foreign.commentId,
      body: "should fail",
    });
    expect(grafted.ok).toBe(false);
    if (!grafted.ok) expect(grafted.reason).toBe("unknown_parent");

    await db
      .updateTable("posts")
      .set({ state: "removed" })
      .where("id", "=", postId)
      .execute();
    const onRemoved = await addComment(db, {
      postId,
      authorId: alice,
      body: "hi",
    });
    expect(onRemoved.ok).toBe(false);
    if (!onRemoved.ok) expect(onRemoved.reason).toBe("post_removed");
  });

  it("caps nesting depth", async () => {
    let parentId: number | null = null;
    for (let i = 0; i < MAX_DEPTH; i++) {
      const res: Awaited<ReturnType<typeof addComment>> = await addComment(db, {
        postId,
        authorId: alice,
        parentId,
        body: `level ${i}`,
      });
      if (!res.ok) throw new Error(`unexpected failure at depth ${i}`);
      expect(res.depth).toBe(i + 1);
      parentId = res.commentId;
    }

    const tooDeep = await addComment(db, {
      postId,
      authorId: alice,
      parentId,
      body: "one too far",
    });
    expect(tooDeep.ok).toBe(false);
    if (!tooDeep.ok) expect(tooDeep.reason).toBe("too_deep");
  });

  it("lets agents comment — they just cannot vote", async () => {
    const res = await addComment(db, {
      postId,
      authorId: scoutBot,
      body: "Agent observation",
    });
    expect(res.ok).toBe(true);
  });
});

describe("getThread", () => {
  it("nests replies under their parents", async () => {
    const a = await addComment(db, { postId, authorId: alice, body: "A" });
    if (!a.ok) throw new Error("setup");
    const b = await addComment(db, {
      postId,
      authorId: bob,
      parentId: a.commentId,
      body: "A.1",
    });
    if (!b.ok) throw new Error("setup");
    await addComment(db, {
      postId,
      authorId: alice,
      parentId: b.commentId,
      body: "A.1.1",
    });
    await addComment(db, { postId, authorId: bob, body: "B" });

    const thread = await getThread(db, postId);
    expect(thread.map((n) => n.body)).toEqual(["A", "B"]);
    expect(thread[0]!.replies.map((n) => n.body)).toEqual(["A.1"]);
    expect(thread[0]!.replies[0]!.replies.map((n) => n.body)).toEqual(["A.1.1"]);
    expect(thread[1]!.replies).toEqual([]);
  });

  it("keeps removed comments as placeholders so replies stay readable", async () => {
    const a = await addComment(db, { postId, authorId: alice, body: "Secret" });
    if (!a.ok) throw new Error("setup");
    await addComment(db, {
      postId,
      authorId: bob,
      parentId: a.commentId,
      body: "Visible reply",
    });

    await db
      .updateTable("comments")
      .set({ removed_at: new Date() })
      .where("id", "=", a.commentId)
      .execute();

    const thread = await getThread(db, postId);
    expect(thread[0]!.body).toBe("[removed]");
    expect(thread[0]!.replies[0]!.body).toBe("Visible reply");
  });

  it("reports the viewer's own comment vote", async () => {
    const a = await addComment(db, { postId, authorId: alice, body: "Rate me" });
    if (!a.ok) throw new Error("setup");
    await voteComment(db, { userId: bob, commentId: a.commentId, value: 1 });

    const asBob = await getThread(db, postId, bob);
    expect(asBob[0]!.viewerVote).toBe(1);

    const anon = await getThread(db, postId);
    expect(anon[0]!.viewerVote).toBeNull();
  });

  it("marks agent authorship", async () => {
    await addComment(db, { postId, authorId: scoutBot, body: "From a bot" });
    const thread = await getThread(db, postId);
    expect(thread[0]!.author.kind).toBe("agent");
  });
});

describe("voteComment", () => {
  it("tallies and is idempotent per user", async () => {
    const a = await addComment(db, { postId, authorId: alice, body: "Rate" });
    if (!a.ok) throw new Error("setup");

    await voteComment(db, { userId: bob, commentId: a.commentId, value: 1 });
    let res = await voteComment(db, {
      userId: bob,
      commentId: a.commentId,
      value: 1,
    });
    expect(res.ok && res.score).toBe(1);

    res = await voteComment(db, {
      userId: bob,
      commentId: a.commentId,
      value: -1,
    });
    expect(res.ok && res.score).toBe(-1);

    const votes = await db.selectFrom("comment_votes").selectAll().execute();
    expect(votes).toHaveLength(1);
  });

  it("moves the timestamp when a comment vote changes direction", async () => {
    const a = await addComment(db, { postId, authorId: alice, body: "Rate" });
    if (!a.ok) throw new Error("setup");

    await voteComment(db, { userId: bob, commentId: a.commentId, value: 1 });

    const longAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await db
      .updateTable("comment_votes")
      .set({ created_at: longAgo })
      .where("comment_id", "=", a.commentId)
      .execute();

    await voteComment(db, { userId: bob, commentId: a.commentId, value: -1 });

    const row = await db
      .selectFrom("comment_votes")
      .select(["created_at", "value"])
      .where("comment_id", "=", a.commentId)
      .executeTakeFirstOrThrow();

    expect(row.value).toBe(-1);
    expect(new Date(row.created_at as unknown as string).getTime()).toBeGreaterThan(
      longAgo.getTime() + 1000,
    );
  });

  it("rejects agent votes at the database boundary", async () => {
    const a = await addComment(db, { postId, authorId: alice, body: "Rate" });
    if (!a.ok) throw new Error("setup");

    const res = await voteComment(db, {
      userId: scoutBot,
      commentId: a.commentId,
      value: 1,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("agents_cannot_vote");

    expect(await db.selectFrom("comment_votes").selectAll().execute()).toHaveLength(0);
  });
});

describe("membership", () => {
  it("joins, reports, and leaves", async () => {
    expect(await getMembership(db, alice, "horror")).toBeNull();

    const res = await joinCommunity(db, alice, "horror");
    expect(res.ok).toBe(true);

    const m = await getMembership(db, alice, "horror");
    expect(m?.role).toBe("member");

    await leaveCommunity(db, alice, "horror");
    expect(await getMembership(db, alice, "horror")).toBeNull();
  });

  it("treats re-joining as a no-op that preserves role", async () => {
    await joinCommunity(db, alice, "horror");
    await db
      .updateTable("community_members")
      .set({ role: "moderator" })
      .where("user_id", "=", alice)
      .execute();

    await joinCommunity(db, alice, "horror");
    const m = await getMembership(db, alice, "horror");
    expect(m?.role).toBe("moderator");
  });

  it("rejects unknown communities", async () => {
    const res = await joinCommunity(db, alice, "nope");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("unknown_community");
  });

  it("lists joined slugs and counts members", async () => {
    await joinCommunity(db, alice, "horror");
    await joinCommunity(db, alice, "scifi");
    await joinCommunity(db, bob, "horror");

    expect(await joinedSlugs(db, alice)).toEqual(["horror", "scifi"]);
    expect(await joinedSlugs(db, null)).toEqual([]);

    const counts = await memberCounts(db);
    expect(counts.get("horror")).toBe(2);
    expect(counts.get("scifi")).toBe(1);
  });

  it("lets agents join — scoping a bot to a community is meaningful", async () => {
    const res = await joinCommunity(db, scoutBot, "horror");
    expect(res.ok).toBe(true);
  });

  it("drops membership when the community is deleted", async () => {
    await joinCommunity(db, alice, "horror");
    await db.deleteFrom("communities").where("slug", "=", "horror").execute();
    expect(await joinedSlugs(db, alice)).toEqual([]);
  });
});
