import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { ltree } from "@electric-sql/pglite/contrib/ltree";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  join(__dirname, "migrations", "0001_init.sql"),
  "utf8",
);

let db: PGlite;

/** Insert a user and return its id. */
async function mkUser(handle: string, kind: "human" | "agent" = "human") {
  const email = kind === "human" ? `${handle}@example.test` : null;
  const res = await db.query<{ id: number }>(
    `INSERT INTO users (handle, email, kind) VALUES ($1, $2, $3) RETURNING id`,
    [handle, email, kind],
  );
  return res.rows[0]!.id;
}

beforeAll(async () => {
  db = await PGlite.create({ extensions: { ltree, pg_trgm } });
  await db.exec(MIGRATION);
}, 60_000);

describe("migration", () => {
  it("applies cleanly", async () => {
    const res = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' ORDER BY table_name`,
    );
    expect(res.rows.map((r) => r.table_name)).toEqual([
      "agents",
      "comments",
      "communities",
      "creators",
      "curation_scores",
      "posts",
      "sources",
      "title_tags",
      "titles",
      "users",
      "votes",
      "watchlist",
    ]);
  });
});

describe("invariant 1 — agents cannot vote (plan §7 rule 3)", () => {
  let humanId: number;
  let agentUserId: number;
  let postId: number;

  beforeAll(async () => {
    humanId = await mkUser("alice");
    agentUserId = await mkUser("scout_bot", "agent");

    const c = await db.query<{ id: number }>(
      `INSERT INTO communities (slug, name) VALUES ('documentaries', 'Documentaries') RETURNING id`,
    );
    const t = await db.query<{ id: number }>(
      `INSERT INTO titles (kind, canonical_name) VALUES ('clip', 'Test Clip') RETURNING id`,
    );
    const p = await db.query<{ id: number }>(
      `INSERT INTO posts (title_id, community_id, author_id, headline)
       VALUES ($1, $2, $3, 'A headline') RETURNING id`,
      [t.rows[0]!.id, c.rows[0]!.id, humanId],
    );
    postId = p.rows[0]!.id;
  });

  it("accepts a vote from a human", async () => {
    await expect(
      db.query(`INSERT INTO votes (user_id, post_id, value) VALUES ($1, $2, 1)`, [
        humanId,
        postId,
      ]),
    ).resolves.toBeDefined();
  });

  it("rejects a vote from an agent", async () => {
    await expect(
      db.query(`INSERT INTO votes (user_id, post_id, value) VALUES ($1, $2, 1)`, [
        agentUserId,
        postId,
      ]),
    ).rejects.toThrow(/agents may not vote/);
  });

  it("rejects an agent sneaking in via UPDATE", async () => {
    await expect(
      db.query(`UPDATE votes SET user_id = $1 WHERE post_id = $2`, [
        agentUserId,
        postId,
      ]),
    ).rejects.toThrow(/agents may not vote/);
  });
});

describe("invariant 2 — one Title per community (plan §2a)", () => {
  let communityId: number;
  let titleId: number;
  let authorId: number;

  beforeAll(async () => {
    authorId = await mkUser("bob");
    const c = await db.query<{ id: number }>(
      `INSERT INTO communities (slug, name) VALUES ('videoessays', 'Video Essays') RETURNING id`,
    );
    communityId = c.rows[0]!.id;
    const t = await db.query<{ id: number }>(
      `INSERT INTO titles (kind, canonical_name) VALUES ('clip', 'Dedup Me') RETURNING id`,
    );
    titleId = t.rows[0]!.id;

    await db.query(
      `INSERT INTO posts (title_id, community_id, author_id, headline)
       VALUES ($1, $2, $3, 'first submission')`,
      [titleId, communityId, authorId],
    );
  });

  it("rejects a second post of the same Title in the same community", async () => {
    await expect(
      db.query(
        `INSERT INTO posts (title_id, community_id, author_id, headline)
         VALUES ($1, $2, $3, 'duplicate submission')`,
        [titleId, communityId, authorId],
      ),
    ).rejects.toThrow(/posts_title_per_community_idx|duplicate key/);
  });

  it("allows the same Title in a different community", async () => {
    const c2 = await db.query<{ id: number }>(
      `INSERT INTO communities (slug, name) VALUES ('shortfilm', 'Short Film') RETURNING id`,
    );
    await expect(
      db.query(
        `INSERT INTO posts (title_id, community_id, author_id, headline)
         VALUES ($1, $2, $3, 'crossposted')`,
        [titleId, c2.rows[0]!.id, authorId],
      ),
    ).resolves.toBeDefined();
  });

  it("allows resubmission after a takedown", async () => {
    await db.query(
      `UPDATE posts SET state = 'removed' WHERE community_id = $1 AND title_id = $2`,
      [communityId, titleId],
    );
    await expect(
      db.query(
        `INSERT INTO posts (title_id, community_id, author_id, headline)
         VALUES ($1, $2, $3, 'resubmitted after removal')`,
        [titleId, communityId, authorId],
      ),
    ).resolves.toBeDefined();
  });
});

describe("agent ownership (plan §7 rule 2)", () => {
  it("requires a human owner", async () => {
    const agentUser = await mkUser("enricher_bot", "agent");
    const otherAgent = await mkUser("owner_bot", "agent");

    await expect(
      db.query(
        `INSERT INTO agents (user_id, owner_user_id, name, api_key_hash)
         VALUES ($1, $2, 'Enricher', 'hash-1')`,
        [agentUser, otherAgent],
      ),
    ).rejects.toThrow(/must be a human user/);

    const human = await mkUser("carol");
    await expect(
      db.query(
        `INSERT INTO agents (user_id, owner_user_id, name, api_key_hash)
         VALUES ($1, $2, 'Enricher', 'hash-2')`,
        [agentUser, human],
      ),
    ).resolves.toBeDefined();
  });

  it("rejects registering a human as an agent", async () => {
    const human = await mkUser("dave");
    const owner = await mkUser("erin");
    await expect(
      db.query(
        `INSERT INTO agents (user_id, owner_user_id, name, api_key_hash)
         VALUES ($1, $2, 'Not An Agent', 'hash-3')`,
        [human, owner],
      ),
    ).rejects.toThrow(/must reference a user of kind=agent/);
  });
});

describe("assorted constraints", () => {
  it("requires humans to have an email", async () => {
    await expect(
      db.query(`INSERT INTO users (handle, kind) VALUES ('noemail', 'human')`),
    ).rejects.toThrow(/humans_have_email/);
  });

  it("ties promoted_at to promoted state", async () => {
    const author = await mkUser("frank");
    const c = await db.query<{ id: number }>(
      `INSERT INTO communities (slug, name) VALUES ('journalism', 'Journalism') RETURNING id`,
    );
    const t = await db.query<{ id: number }>(
      `INSERT INTO titles (kind, canonical_name) VALUES ('clip', 'State Check') RETURNING id`,
    );
    await expect(
      db.query(
        `INSERT INTO posts (title_id, community_id, author_id, headline, state)
         VALUES ($1, $2, $3, 'promoted with no timestamp', 'promoted')`,
        [t.rows[0]!.id, c.rows[0]!.id, author],
      ),
    ).rejects.toThrow(/promoted_has_timestamp/);
  });

  it("enforces the sources dedup key that sourceKey() produces", async () => {
    const t = await db.query<{ id: number }>(
      `INSERT INTO titles (kind, canonical_name) VALUES ('clip', 'Source Dedup') RETURNING id`,
    );
    const id = t.rows[0]!.id;
    await db.query(
      `INSERT INTO sources (title_id, platform, external_id, url, embeddable)
       VALUES ($1, 'youtube', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', TRUE)`,
      [id],
    );
    await expect(
      db.query(
        `INSERT INTO sources (title_id, platform, external_id, url, embeddable)
         VALUES ($1, 'youtube', 'dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ', TRUE)`,
        [id],
      ),
    ).rejects.toThrow(/sources_platform_external_key|duplicate key/);
  });

  it("stores comment trees as ltree paths", async () => {
    const author = await mkUser("grace");
    const c = await db.query<{ id: number }>(
      `INSERT INTO communities (slug, name) VALUES ('livemusic', 'Live Music') RETURNING id`,
    );
    const t = await db.query<{ id: number }>(
      `INSERT INTO titles (kind, canonical_name) VALUES ('clip', 'Thread Test') RETURNING id`,
    );
    const p = await db.query<{ id: number }>(
      `INSERT INTO posts (title_id, community_id, author_id, headline)
       VALUES ($1, $2, $3, 'thread') RETURNING id`,
      [t.rows[0]!.id, c.rows[0]!.id, author],
    );
    const postId = p.rows[0]!.id;

    const root = await db.query<{ id: number }>(
      `INSERT INTO comments (post_id, author_id, body, path)
       VALUES ($1, $2, 'root', '1') RETURNING id`,
      [postId, author],
    );
    await db.query(
      `INSERT INTO comments (post_id, author_id, parent_id, body, path)
       VALUES ($1, $2, $3, 'reply', '1.1')`,
      [postId, author, root.rows[0]!.id],
    );

    const subtree = await db.query<{ body: string }>(
      `SELECT body FROM comments WHERE post_id = $1 AND path <@ '1' ORDER BY path`,
      [postId],
    );
    expect(subtree.rows.map((r) => r.body)).toEqual(["root", "reply"]);
  });
});
