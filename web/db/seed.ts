/**
 * Development seed.
 *
 * The five communities are the beachhead (plan §2c). Each was picked because
 * its audience self-identifies, its judgments are genuinely contested, its
 * supply is continuous, and more than one kind of conversation works in it.
 * Each also spans both card modes — features and series to decide about,
 * shorts and clips to watch now — so neither mode rots for lack of content.
 *
 * Two kinds of seed data, mirroring the two real intake paths:
 *
 *   1. Submitted links, through `submitUrl`, exactly as a user or agent
 *      would. These use well-known landmark YouTube uploads because their
 *      IDs are verifiable and the embeds actually play — they are plumbing
 *      fixtures, not curated examples of each community's taste.
 *
 *   2. Catalog titles, inserted directly, as TMDB enrichment will do. These
 *      are real films and series with no source attached, which is the
 *      honest pre-enrichment state: known work, where-to-watch not yet
 *      resolved. They render in queue mode.
 *
 * Curating real per-community content is editorial work, not code.
 *
 *   npm run seed
 */

import { getDb, type Db } from "../src/lib/db/client";
import type { TitleKind } from "../src/lib/db/types";
import { submitUrl } from "../src/lib/submit/submit";
import { castVote } from "../src/lib/submit/vote";

const COMMUNITIES = [
  {
    slug: "horror",
    name: "Horror",
    description:
      "Features, series, and shorts. Folk horror to slashers — argue about what actually works.",
    promote_threshold: 3,
    default_mode: "queue" as const,
  },
  {
    slug: "anime",
    name: "Anime",
    description:
      "Seasonal series, films, and clips. New season, new argument.",
    promote_threshold: 3,
    default_mode: "queue" as const,
  },
  {
    slug: "docs",
    name: "Documentaries",
    description:
      "Feature docs, docuseries, and short-form. Nature to investigation.",
    promote_threshold: 3,
    default_mode: "queue" as const,
  },
  {
    slug: "scifi",
    name: "Science Fiction",
    description:
      "Film, television, and the deep bench of independent sci-fi shorts.",
    promote_threshold: 3,
    default_mode: "queue" as const,
  },
  {
    slug: "videoessays",
    name: "Video Essays",
    description:
      "Criticism and analysis on video — including about everything else here.",
    promote_threshold: 2,
    default_mode: "watch" as const,
  },
];

const HUMANS = ["ada", "grace", "linus", "margaret"];

/** Landmark uploads with verifiable IDs, used as plumbing fixtures. */
const SUBMISSIONS = [
  {
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    community: "docs",
    headline: "The first video ever uploaded to YouTube (2005)",
    author: "ada",
    tags: ["archival", "short"],
    upvoters: ["grace", "linus", "margaret"],
  },
  {
    url: "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
    community: "videoessays",
    headline: "Queen — Bohemian Rhapsody, the promo film that made music video",
    author: "grace",
    tags: ["archival", "musical"],
    upvoters: ["ada", "linus"],
  },
  {
    url: "https://www.youtube.com/watch?v=9bZkp7q19f0",
    community: "videoessays",
    headline: "The first video to pass a billion views",
    author: "linus",
    tags: ["archival"],
    upvoters: ["ada"], // below threshold — stays in the queue
  },
  {
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    community: "videoessays",
    headline: "Scouted: how one 1987 music video became internet infrastructure",
    author: "scout_bot", // agent submission — proposes, never promotes itself
    tags: ["archival", "quirky"],
    upvoters: [],
  },
];

/** Real works, no source yet — the state TMDB enrichment resolves. */
const CATALOG: {
  community: string;
  headline: string;
  author: string;
  name: string;
  year: number;
  kind: TitleKind;
  tags: string[];
  upvoters: string[];
}[] = [
  {
    community: "horror",
    headline: "Still the most upsetting family drama of the last decade",
    author: "margaret",
    name: "Hereditary",
    year: 2018,
    kind: "film",
    tags: ["horror", "feature", "unsettling", "slow-burn", "american"],
    upvoters: ["ada", "grace", "linus"],
  },
  {
    community: "horror",
    headline: "The one that defined folk horror for a generation",
    author: "ada",
    name: "The Wicker Man",
    year: 1973,
    kind: "film",
    tags: ["horror", "feature", "folk-horror", "british", "unsettling"],
    upvoters: ["grace"], // below threshold
  },
  {
    community: "scifi",
    headline: "Linguistics as first contact — worth rewatching for the structure",
    author: "grace",
    name: "Arrival",
    year: 2016,
    kind: "film",
    tags: ["scifi", "feature", "mind-bending", "meditative", "american"],
    upvoters: ["ada", "linus", "margaret"],
  },
  {
    community: "docs",
    headline: "Dramatised, but the best thing ever made about institutional failure",
    author: "linus",
    name: "Chernobyl",
    year: 2019,
    kind: "series",
    tags: ["limited-series", "drama", "bleak", "british", "biography"],
    upvoters: ["ada", "grace", "margaret"],
  },
  {
    community: "anime",
    headline: "The film that made the case for animation as a serious medium",
    author: "ada",
    name: "Grave of the Fireflies",
    year: 1988,
    kind: "film",
    tags: ["animation", "feature", "japanese", "bleak", "war"],
    upvoters: ["grace", "linus", "margaret"],
  },
  {
    community: "anime",
    headline: "Still the high-water mark for cyberpunk animation",
    author: "linus",
    name: "Ghost in the Shell",
    year: 1995,
    kind: "film",
    tags: ["animation", "scifi", "feature", "japanese", "mind-bending"],
    upvoters: ["ada"], // below threshold
  },
];

async function tag(db: Db, titleId: number, tags: string[]) {
  if (tags.length === 0) return;
  await db
    .insertInto("title_tags")
    .values(tags.map((t) => ({ title_id: titleId, tag: t })))
    .execute();
}

async function main() {
  const db = await getDb();

  const existing = await db.selectFrom("communities").select("slug").execute();
  if (existing.length > 0) {
    console.log("Already seeded. Delete web/.pglite to start over.");
    return;
  }

  await db.insertInto("communities").values(COMMUNITIES).execute();

  const users = new Map<string, number>();
  for (const handle of HUMANS) {
    const row = await db
      .insertInto("users")
      .values({ handle, email: `${handle}@example.test`, kind: "human" })
      .returning("id")
      .executeTakeFirstOrThrow();
    users.set(handle, row.id);
  }

  const bot = await db
    .insertInto("users")
    .values({ handle: "scout_bot", kind: "agent" })
    .returning("id")
    .executeTakeFirstOrThrow();
  users.set("scout_bot", bot.id);

  await db
    .insertInto("agents")
    .values({
      user_id: bot.id,
      owner_user_id: users.get("ada")!,
      name: "Scout",
      description: "Surfaces under-viewed video matching a community's taste.",
      api_key_hash: "seed-placeholder-not-a-real-key",
    })
    .execute();

  const report: string[] = [];

  // Path 1: submitted links, through the real pipeline.
  for (const post of SUBMISSIONS) {
    const res = await submitUrl(db, {
      url: post.url,
      communitySlug: post.community,
      authorId: users.get(post.author)!,
      headline: post.headline,
    });
    if (!res.ok) {
      console.warn(`  skipped "${post.headline}": ${res.reason}`);
      continue;
    }
    await tag(db, res.titleId, post.tags);
    for (const handle of post.upvoters) {
      await castVote(db, {
        userId: users.get(handle)!,
        postId: res.postId,
        value: 1,
      });
    }
    const { state } = await db
      .selectFrom("posts")
      .select("state")
      .where("id", "=", res.postId)
      .executeTakeFirstOrThrow();
    report.push(`  ${state.padEnd(9)} watch  /v/${post.community}  ${post.headline}`);
  }

  // Path 2: catalog titles with no source, as enrichment will create them.
  for (const entry of CATALOG) {
    const community = await db
      .selectFrom("communities")
      .select("id")
      .where("slug", "=", entry.community)
      .executeTakeFirstOrThrow();

    const title = await db
      .insertInto("titles")
      .values({
        kind: entry.kind,
        canonical_name: entry.name,
        year: entry.year,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await tag(db, title.id, entry.tags);

    const post = await db
      .insertInto("posts")
      .values({
        title_id: title.id,
        community_id: community.id,
        author_id: users.get(entry.author)!,
        headline: entry.headline,
        state: "proposed",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    for (const handle of entry.upvoters) {
      await castVote(db, {
        userId: users.get(handle)!,
        postId: post.id,
        value: 1,
      });
    }

    const { state } = await db
      .selectFrom("posts")
      .select("state")
      .where("id", "=", post.id)
      .executeTakeFirstOrThrow();
    report.push(
      `  ${state.padEnd(9)} queue  /v/${entry.community}  ${entry.name} (${entry.year})`,
    );
  }

  console.log(report.join("\n"));

  const tagCount = await db
    .selectFrom("tags")
    .select((eb) => eb.fn.countAll<number>().as("n"))
    .executeTakeFirstOrThrow();
  console.log(
    `\n${COMMUNITIES.length} communities, ${tagCount.n} tags in the vocabulary.`,
  );
  console.log("Seeded. Run `npm run dev`.");
}

// PGlite keeps handles open that would otherwise hold the process forever,
// so a CLI has to exit explicitly rather than waiting for an empty event loop.
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
