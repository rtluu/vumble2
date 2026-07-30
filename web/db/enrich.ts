/**
 * Run enrichment over Titles that need it.
 *
 * Hits real oEmbed endpoints — no API key required, since those are public.
 * TMDB (films and series) is not wired up: its terms require a written
 * commercial agreement, so catalog Titles stay unenriched until that exists.
 *
 *   npm run enrich          # up to 50
 *   npm run enrich -- 200
 *
 * Stop the dev server first; PGlite is single-writer.
 */

import { getDb } from "../src/lib/db/client";
import { enrichPending } from "../src/lib/enrichment/enrich";

async function main() {
  const limit = Number(process.argv[2] ?? 50);
  const db = await getDb();

  const before = await db
    .selectFrom("titles")
    .select(["id", "canonical_name"])
    .where("enriched_at", "is", null)
    .execute();

  if (before.length === 0) {
    console.log("Nothing to enrich.");
    return;
  }

  console.log(`${before.length} title(s) awaiting enrichment.\n`);

  const summary = await enrichPending(db, { limit });

  const after = await db
    .selectFrom("titles")
    .leftJoin("creators", "creators.id", "titles.creator_id")
    .select([
      "titles.canonical_name",
      "titles.runtime_s",
      "titles.enrichment_provider",
      "creators.name as creator",
    ])
    .where("titles.enriched_at", "is not", null)
    .orderBy("titles.id")
    .execute();

  for (const t of after) {
    const runtime = t.runtime_s ? `${t.runtime_s}s` : "—";
    console.log(
      `  ${t.canonical_name.slice(0, 44).padEnd(46)} ${(t.creator ?? "—").slice(0, 18).padEnd(20)} ${runtime}`,
    );
  }

  console.log(
    `\nconsidered ${summary.considered}  enriched ${summary.enriched}  missed ${summary.missed}  deferred ${summary.deferred}  skipped ${summary.skipped}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
