import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { ltree } from "@electric-sql/pglite/contrib/ltree";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { Kysely } from "kysely";
import { PGliteDialect } from "./pglite-dialect";
import type { Database } from "./types";

export type Db = Kysely<Database>;

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

export function readMigration(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), "utf8");
}

/** Every migration in filename order. Names are zero-padded, so lexical is chronological. */
export function migrationNames(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/**
 * Apply any migrations this database has not seen.
 *
 * Each migration file manages its own transaction, so the runner records the
 * name afterwards rather than wrapping. That means a migration that fails
 * partway leaves itself unrecorded and will be retried — which is the right
 * behaviour given each file is internally atomic.
 */
export async function migrate(client: PGlite): Promise<string[]> {
  await client.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const applied = await client.query<{ name: string }>(
    "SELECT name FROM schema_migrations",
  );
  const seen = new Set(applied.rows.map((r) => r.name));

  const ran: string[] = [];
  for (const name of migrationNames()) {
    if (seen.has(name)) continue;
    await client.exec(readMigration(name));
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
      name,
    ]);
    ran.push(name);
  }
  return ran;
}

/**
 * An in-memory Postgres with the schema applied.
 *
 * PGlite is real Postgres compiled to WASM, so triggers, constraints, and
 * ltree behave as they do in production. This backs tests and local dev,
 * which keeps Phase 1 from blocking on a hosted-Postgres decision — moving
 * to Neon or Supabase later swaps the dialect, not the queries.
 */
export async function createTestDb(): Promise<Db> {
  const client = await PGlite.create({ extensions: { ltree, pg_trgm } });
  await migrate(client);
  return new Kysely<Database>({ dialect: new PGliteDialect(client) });
}

let cached: Promise<Db> | null = null;

/**
 * The application database.
 *
 * Dev and test run PGlite; `PGLITE_DIR` persists it across restarts. When a
 * hosted Postgres arrives, this is the one function that changes — it returns
 * a Kysely over `PostgresDialect` and everything above it is untouched.
 */
export function getDb(): Promise<Db> {
  if (!cached) {
    cached = (async () => {
      const dataDir = process.env.PGLITE_DIR ?? join(process.cwd(), ".pglite");
      const client = await PGlite.create({
        dataDir,
        extensions: { ltree, pg_trgm },
      });
      await migrate(client);
      return new Kysely<Database>({ dialect: new PGliteDialect(client) });
    })();
  }
  return cached;
}
