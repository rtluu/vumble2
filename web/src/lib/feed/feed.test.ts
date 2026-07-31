import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "@/lib/db/client";
import { submitUrl } from "@/lib/submit/submit";
import { castVote } from "@/lib/submit/vote";
import { cardMode, getFeed, getPost, thumbnailFor } from "./feed";

let db: Db;
let alice: number;
let bob: number;
let carol: number;
let scoutBot: number;

const VIDEOS = [
  "https://www.youtube.com/watch?v=aaaaaaaaaaa",
  "https://www.youtube.com/watch?v=bbbbbbbbbbb",
  "https://www.youtube.com/watch?v=ccccccccccc",
  "https://www.youtube.com/watch?v=ddddddddddd",
];

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

async function propose(url: string, headline: string, authorId = alice) {
  const res = await submitUrl(db, {
    url,
    communitySlug: "documentaries",
    authorId,
    headline,
  });
  if (!res.ok) throw new Error(`setup failed: ${res.reason}`);
  return res.postId;
}

/** Promote by meeting the threshold (2) with real human upvotes. */
async function promote(postId: number) {
  await castVote(db, { userId: bob, postId, value: 1 });
  await castVote(db, { userId: carol, postId, value: 1 });
}

beforeEach(async () => {
  db = await createTestDb();
  await db
    .insertInto("communities")
    .values([
      { slug: "documentaries", name: "Documentaries", promote_threshold: 2 },
      { slug: "videoessays", name: "Video Essays", promote_threshold: 2 },
    ])
    .execute();

  alice = await mkUser("alice");
  bob = await mkUser("bob");
  carol = await mkUser("carol");
  scoutBot = await mkUser("scout_bot", "agent");
}, 60_000);

describe("surfaces", () => {
  it("keeps proposed posts out of the promoted feed", async () => {
    const promoted = await propose(VIDEOS[0]!, "Promoted one");
    await propose(VIDEOS[1]!, "Still proposed");
    await promote(promoted);

    const main = await getFeed(db, { communitySlug: "documentaries" });
    expect(main.items.map((i) => i.headline)).toEqual(["Promoted one"]);

    const queue = await getFeed(db, {
      communitySlug: "documentaries",
      surface: "proposed",
    });
    expect(queue.items.map((i) => i.headline)).toEqual(["Still proposed"]);
  });

  it("shows agent submissions in the proposal queue, labelled", async () => {
    await propose(VIDEOS[0]!, "Agent found this", scoutBot);

    const queue = await getFeed(db, {
      communitySlug: "documentaries",
      surface: "proposed",
    });
    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]!.author).toEqual({
      handle: "scout_bot",
      kind: "agent",
    });
  });

  it("excludes removed posts from both surfaces", async () => {
    const postId = await propose(VIDEOS[0]!, "Doomed");
    await db
      .updateTable("posts")
      .set({ state: "removed" })
      .where("id", "=", postId)
      .execute();

    expect((await getFeed(db, { surface: "promoted" })).items).toHaveLength(0);
    expect((await getFeed(db, { surface: "proposed" })).items).toHaveLength(0);
  });

  it("filters by community", async () => {
    const a = await propose(VIDEOS[0]!, "In documentaries");
    await promote(a);

    const res = await submitUrl(db, {
      url: VIDEOS[1]!,
      communitySlug: "videoessays",
      authorId: alice,
      headline: "In videoessays",
    });
    if (res.ok) await promote(res.postId);

    const docs = await getFeed(db, { communitySlug: "documentaries" });
    expect(docs.items.map((i) => i.headline)).toEqual(["In documentaries"]);

    const all = await getFeed(db, {});
    expect(all.items).toHaveLength(2);
  });
});

describe("sorting", () => {
  it("orders by score under top", async () => {
    const low = await propose(VIDEOS[0]!, "Low");
    const high = await propose(VIDEOS[1]!, "High");
    await promote(low);
    await promote(high);
    await castVote(db, { userId: alice, postId: high, value: 1 });

    const feed = await getFeed(db, { sort: "top" });
    expect(feed.items.map((i) => i.headline)).toEqual(["High", "Low"]);
  });

  it("orders newest first under new", async () => {
    const first = await propose(VIDEOS[0]!, "First");
    const second = await propose(VIDEOS[1]!, "Second");
    await promote(first);
    await promote(second);

    const feed = await getFeed(db, { sort: "new" });
    expect(feed.items.map((i) => i.headline)).toEqual(["Second", "First"]);
  });

  it("orders by hot_rank under hot", async () => {
    const a = await propose(VIDEOS[0]!, "A");
    const b = await propose(VIDEOS[1]!, "B");
    await promote(a);
    await promote(b);
    await castVote(db, { userId: alice, postId: a, value: 1 });

    const feed = await getFeed(db, { sort: "hot" });
    const ranks = feed.items.map((i) => i.score);
    expect(ranks[0]).toBeGreaterThanOrEqual(ranks[1]!);
  });
});

describe("pagination", () => {
  it("walks every item exactly once with no overlap", async () => {
    for (const [i, url] of VIDEOS.entries()) {
      const id = await propose(url, `Post ${i}`);
      await promote(id);
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    for (let guard = 0; guard < 10; guard++) {
      const page: Awaited<ReturnType<typeof getFeed>> = await getFeed(db, {
        sort: "new",
        limit: 2,
        cursor,
      });
      seen.push(...page.items.map((i) => i.headline));
      cursor = page.nextCursor;
      if (!cursor) break;
    }

    expect(seen).toHaveLength(VIDEOS.length);
    expect(new Set(seen).size).toBe(VIDEOS.length);
  });

  it("returns no cursor on the final page", async () => {
    const id = await propose(VIDEOS[0]!, "Only");
    await promote(id);

    const page = await getFeed(db, { limit: 25 });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeNull();
  });

  it("ignores a malformed cursor rather than throwing", async () => {
    const id = await propose(VIDEOS[0]!, "Only");
    await promote(id);

    const page = await getFeed(db, { cursor: "!!!not-base64!!!" });
    expect(page.items).toHaveLength(1);
  });
});

describe("tag filtering", () => {
  async function tagged(postId: number, titleTags: string[]) {
    const post = await db
      .selectFrom("posts")
      .select("title_id")
      .where("id", "=", postId)
      .executeTakeFirstOrThrow();
    await db
      .insertInto("title_tags")
      .values(titleTags.map((t) => ({ title_id: post.title_id, tag: t })))
      .execute();
  }

  it("filters across communities by facet tag", async () => {
    const a = await propose(VIDEOS[0]!, "Scary one");
    const b = await propose(VIDEOS[1]!, "Not scary");
    await promote(a);
    await promote(b);
    await tagged(a, ["horror", "feature"]);
    await tagged(b, ["comedy"]);

    const horror = await getFeed(db, { tag: "horror" });
    expect(horror.items.map((i) => i.headline)).toEqual(["Scary one"]);

    const comedy = await getFeed(db, { tag: "comedy" });
    expect(comedy.items.map((i) => i.headline)).toEqual(["Not scary"]);
  });

  it("returns tags on the item, alphabetically", async () => {
    const id = await propose(VIDEOS[0]!, "Tagged");
    await promote(id);
    await tagged(id, ["unsettling", "horror", "feature"]);

    const feed = await getFeed(db, {});
    expect(feed.items[0]!.title.tags).toEqual([
      "feature",
      "horror",
      "unsettling",
    ]);
  });

  it("gives an empty array, not null, when untagged", async () => {
    const id = await propose(VIDEOS[0]!, "Bare");
    await promote(id);

    const feed = await getFeed(db, {});
    expect(feed.items[0]!.title.tags).toEqual([]);
  });

  it("rejects tags outside the controlled vocabulary", async () => {
    const id = await propose(VIDEOS[0]!, "Bad tag");
    await expect(tagged(id, ["sci-fi"])).rejects.toThrow(
      /title_tags_tag_fkey|violates foreign key/,
    );
  });

  it("combines a tag with a community filter", async () => {
    const a = await propose(VIDEOS[0]!, "Horror in documentaries");
    await promote(a);
    await tagged(a, ["horror"]);

    const res = await submitUrl(db, {
      url: VIDEOS[1]!,
      communitySlug: "videoessays",
      authorId: alice,
      headline: "Horror in videoessays",
    });
    if (res.ok) {
      await promote(res.postId);
      await tagged(res.postId, ["horror"]);
    }

    const all = await getFeed(db, { tag: "horror" });
    expect(all.items).toHaveLength(2);

    const scoped = await getFeed(db, {
      tag: "horror",
      communitySlug: "documentaries",
    });
    expect(scoped.items.map((i) => i.headline)).toEqual([
      "Horror in documentaries",
    ]);
  });
});

describe("thumbnailFor", () => {
  it("derives a still from the work's own YouTube id", async () => {
    const id = await propose(VIDEOS[0]!, "Has a source");
    await promote(id);

    const feed = await getFeed(db, {});
    expect(thumbnailFor(feed.items[0]!)).toBe(
      "https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg",
    );
  });

  it("falls back to the trailer for a catalog Title with no source", async () => {
    const community = await db
      .selectFrom("communities")
      .select("id")
      .where("slug", "=", "documentaries")
      .executeTakeFirstOrThrow();

    const title = await db
      .insertInto("titles")
      .values({ kind: "film", canonical_name: "A Film", year: 2001 })
      .returning("id")
      .executeTakeFirstOrThrow();

    await db
      .insertInto("sources")
      .values({
        title_id: title.id,
        role: "trailer",
        platform: "youtube",
        external_id: "trailerid01",
        url: "https://www.youtube.com/watch?v=trailerid01",
        embeddable: true,
        provenance: "piped-search",
      })
      .execute();

    const post = await db
      .insertInto("posts")
      .values({
        title_id: title.id,
        community_id: community.id,
        author_id: alice,
        headline: "Catalog entry",
        state: "promoted",
        promoted_at: new Date(),
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const item = await getPost(db, post.id);
    expect(item!.source).toBeNull();
    expect(thumbnailFor(item!)).toBe(
      "https://i.ytimg.com/vi/trailerid01/hqdefault.jpg",
    );
  });

  it("prefers the trailer over a stored image on a catalog Title", async () => {
    // Guards a real regression: rows enriched before P18 was understood to
    // be a wordmark still carry one in poster_url, and it is 1268x156 —
    // cropped to a thumbnail it reads as a blank grey box.
    const community = await db
      .selectFrom("communities")
      .select("id")
      .where("slug", "=", "documentaries")
      .executeTakeFirstOrThrow();

    const title = await db
      .insertInto("titles")
      .values({
        kind: "film",
        canonical_name: "Stale Art",
        poster_url: "https://commons.wikimedia.org/wordmark.png",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await db
      .insertInto("sources")
      .values({
        title_id: title.id,
        role: "trailer",
        platform: "youtube",
        external_id: "trailerid02",
        url: "https://www.youtube.com/watch?v=trailerid02",
        embeddable: true,
      })
      .execute();

    const post = await db
      .insertInto("posts")
      .values({
        title_id: title.id,
        community_id: community.id,
        author_id: alice,
        headline: "Has both",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    expect(thumbnailFor((await getPost(db, post.id))!)).toBe(
      "https://i.ytimg.com/vi/trailerid02/hqdefault.jpg",
    );
  });

  it("returns null when there is nothing to show", async () => {
    const community = await db
      .selectFrom("communities")
      .select("id")
      .where("slug", "=", "documentaries")
      .executeTakeFirstOrThrow();
    const title = await db
      .insertInto("titles")
      .values({ kind: "film", canonical_name: "Bare" })
      .returning("id")
      .executeTakeFirstOrThrow();
    const post = await db
      .insertInto("posts")
      .values({
        title_id: title.id,
        community_id: community.id,
        author_id: alice,
        headline: "No art at all",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    // Lays out without a gap rather than rendering a broken image.
    expect(thumbnailFor((await getPost(db, post.id))!)).toBeNull();
  });
});

describe("item shape", () => {
  it("carries the resolved source through to the card", async () => {
    const id = await propose(
      "https://www.youtube.com/watch?v=aaaaaaaaaaa&t=30",
      "With a timestamp",
    );
    await promote(id);

    const feed = await getFeed(db, {});
    const item = feed.items[0]!;
    expect(item.source).toMatchObject({
      platform: "youtube",
      externalId: "aaaaaaaaaaa",
      embeddable: true,
      startSeconds: 30,
    });
    expect(cardMode(item)).toBe("watch");
  });

  it("falls back to queue mode when nothing is embeddable", async () => {
    const id = await propose(VIDEOS[0]!, "Not embeddable");
    await promote(id);
    await db.updateTable("sources").set({ embeddable: false }).execute();

    const feed = await getFeed(db, {});
    expect(cardMode(feed.items[0]!)).toBe("queue");
  });

  it("counts comments and excludes removed ones", async () => {
    const postId = await propose(VIDEOS[0]!, "Discussed");
    await promote(postId);

    await db
      .insertInto("comments")
      .values([
        { post_id: postId, author_id: alice, body: "one", path: "1" },
        { post_id: postId, author_id: bob, body: "two", path: "2" },
        {
          post_id: postId,
          author_id: bob,
          body: "gone",
          path: "3",
          removed_at: new Date(),
        },
      ])
      .execute();

    const feed = await getFeed(db, {});
    expect(feed.items[0]!.commentCount).toBe(2);
  });

  it("reports the viewer's own vote, and nothing when anonymous", async () => {
    const postId = await propose(VIDEOS[0]!, "Voted on");
    await promote(postId); // bob and carol upvote

    const asBob = await getFeed(db, { viewerId: bob });
    expect(asBob.items[0]!.viewerVote).toBe(1);

    const asAlice = await getFeed(db, { viewerId: alice });
    expect(asAlice.items[0]!.viewerVote).toBeNull();

    const anon = await getFeed(db, {});
    expect(anon.items[0]!.viewerVote).toBeNull();
  });
});
