/**
 * Mint an API key for a seeded agent.
 *
 * Stands in for the developer portal. The key is printed once — only its
 * SHA-256 is stored, so a lost key must be rotated rather than recovered.
 *
 *   npm run agent:key            # rotate scout_bot's key
 *   npm run agent:key -- my_bot  # rotate a different agent
 *
 * Stop the dev server first: PGlite is a single-writer embedded database and
 * both processes cannot hold the same data directory.
 */

import { registerAgent, rotateKey } from "../src/lib/agents/auth";
import { getDb } from "../src/lib/db/client";

async function main() {
  const handle = process.argv[2] ?? "scout_bot";
  const db = await getDb();

  const existing = await db
    .selectFrom("agents")
    .innerJoin("users", "users.id", "agents.user_id")
    .select(["agents.id", "users.handle"])
    .where("users.handle", "=", handle)
    .executeTakeFirst();

  let key: string;

  if (existing) {
    key = await rotateKey(db, existing.id);
    console.log(`Rotated key for @${handle}. The previous key no longer works.`);
  } else {
    const owner = await db
      .selectFrom("users")
      .select("id")
      .where("kind", "=", "human")
      .orderBy("id")
      .executeTakeFirst();

    if (!owner) {
      throw new Error("No human user to own the agent. Run `npm run seed` first.");
    }

    const reg = await registerAgent(db, {
      handle,
      name: handle,
      description: "Created by db/agent-key.ts",
      ownerUserId: owner.id,
    });
    key = reg.key;
    console.log(`Registered @${handle}.`);
  }

  console.log(`\n  ${key}\n`);
  console.log("Shown once. Try it:\n");
  console.log(
    `  curl -s localhost:3000/api/v1/me -H "Authorization: Bearer ${key}" | jq`,
  );
}

// PGlite keeps handles open that would otherwise hold the process forever,
// so a CLI has to exit explicitly rather than waiting for an empty event loop.
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
