import { readFileSync } from "node:fs";
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

/**
 * An in-memory Postgres with the schema applied.
 *
 * PGlite is real Postgres compiled to WASM, so triggers, constraints, and
 * ltree behave as they do in production. This backs tests and local dev,
 * which keeps Phase 1 from blocking on a hosted-Postgres decision — moving
 * to Neon or Supabase later is a dialect swap, not a rewrite.
 */
export async function createTestDb(): Promise<Db> {
  const client = await PGlite.create({ extensions: { ltree, pg_trgm } });
  await client.exec(readMigration("0001_init.sql"));
  return new Kysely<Database>({ dialect: new PGliteDialect(client) });
}
