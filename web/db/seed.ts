/**
 * Development seed.
 *
 * The five communities here are the placeholder beachhead from the plan
 * (§12, open decision 1) — chosen because algorithmic feeds underserve them,
 * not because the audience has been confirmed. Swap them once that call is
 * made; nothing downstream depends on these particular slugs.
 *
 * Videos are well-known public YouTube uploads so the embeds actually play.
 * The headlines describe the real videos rather than inventing content.
 *
 *   npm run seed
 */

import { getDb } from "../src/lib/db/client";
import { submitUrl } from "../src/lib/submit/submit";
import { castVote } from "../src/lib/submit/vote";

const COMMUNITIES = [
  {
    slug: "documentaries",
    name: "Documentaries",
    description: "Feature and short documentary, any platform.",
    promote_threshold: 3,
    default_mode: "queue" as const,
  },
  {
    slug: "videoessays",
    name: "Video Essays",
    description: "Argument, criticism, and analysis on video.",
    promote_threshold: 3,
    default_mode: "watch" as const,
  },
  {
    slug: "journalism",
    name: "Long-form Journalism",
    description: "Reported video journalism and investigations.",
    promote_threshold: 3,
    default_mode: "watch" as const,
  },
  {
    slug: "shortfilm",
    name: "Short Film",
    description: "Independent and student short film.",
    promote_threshold: 2,
    default_mode: "watch" as const,
  },
  {
    slug: "livemusic",
    name: "Live Music",
    description: "Performances, sessions, and concert film.",
    promote_threshold: 2,
    default_mode: "watch" as const,
  },
];

const HUMANS = ["ada", "grace", "linus", "margaret"];

const POSTS = [
  {
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    community: "documentaries",
    headline: "The first video ever uploaded to YouTube (2005)",
    author: "ada",
    upvoters: ["grace", "linus", "margaret"],
  },
  {
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    community: "livemusic",
    headline: "Rick Astley — Never Gonna Give You Up (1987)",
    author: "grace",
    upvoters: ["ada", "linus"],
  },
  {
    url: "https://www.youtube.com/watch?v=9bZkp7q19f0",
    community: "livemusic",
    headline: "PSY — Gangnam Style, the first video to pass a billion views",
    author: "linus",
    upvoters: ["ada"], // below threshold: stays in the proposal queue
  },
  {
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw&t=10",
    community: "videoessays",
    headline: "Scouted: early internet video as a primary source",
    author: "scout_bot", // agent submission — starts, and stays, proposed
    upvoters: [],
  },
];

async function main() {
  const db = await getDb();

  const existing = await db.selectFrom("communities").select("slug").execute();
  if (existing.length > 0) {
    console.log("Already seeded. Delete .pglite to start over.");
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

  const botUser = await db
    .insertInto("users")
    .values({ handle: "scout_bot", kind: "agent" })
    .returning("id")
    .executeTakeFirstOrThrow();
  users.set("scout_bot", botUser.id);

  await db
    .insertInto("agents")
    .values({
      user_id: botUser.id,
      owner_user_id: users.get("ada")!,
      name: "Scout",
      description: "Surfaces under-viewed video matching a community's taste.",
      api_key_hash: "seed-placeholder-not-a-real-key",
    })
    .execute();

  for (const post of POSTS) {
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

    for (const handle of post.upvoters) {
      await castVote(db, {
        userId: users.get(handle)!,
        postId: res.postId,
        value: 1,
      });
    }

    const state = await db
      .selectFrom("posts")
      .select("state")
      .where("id", "=", res.postId)
      .executeTakeFirstOrThrow();
    console.log(`  ${state.state.padEnd(9)} /v/${post.community}  ${post.headline}`);
  }

  console.log("\nSeeded. Run `npm run dev`.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
