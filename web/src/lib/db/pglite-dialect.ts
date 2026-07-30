import type { PGlite } from "@electric-sql/pglite";
import {
  type CompiledQuery,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  type Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type QueryResult,
} from "kysely";

/**
 * A Kysely dialect for PGlite.
 *
 * `kysely-pglite` exists but targets a Kysely that still exported `Migrator`
 * from the package root, and it pulls a CLI toolchain (oclif, chokidar,
 * kysely-codegen) in as hard dependencies. PGlite speaks Postgres, so the
 * adapter, compiler, and introspector come straight from Kysely's own
 * Postgres support and only the driver is ours.
 */

class PGliteConnection implements DatabaseConnection {
  constructor(private readonly client: PGlite) {}

  async executeQuery<R>(compiled: CompiledQuery): Promise<QueryResult<R>> {
    const result = await this.client.query<R>(compiled.sql, [
      ...compiled.parameters,
    ]);

    return {
      rows: result.rows,
      numAffectedRows:
        result.affectedRows === undefined
          ? undefined
          : BigInt(result.affectedRows),
    };
  }

  async *streamQuery<R>(
    compiled: CompiledQuery,
  ): AsyncIterableIterator<QueryResult<R>> {
    // PGlite has no cursor API; a single chunk is honest rather than a
    // fake stream that buffers everything anyway.
    yield await this.executeQuery<R>(compiled);
  }
}

class PGliteDriver implements Driver {
  private connection: PGliteConnection | null = null;
  /** PGlite is a single connection, so overlapping transactions must queue. */
  private lock: Promise<void> = Promise.resolve();

  constructor(private readonly client: PGlite) {}

  async init(): Promise<void> {
    await this.client.waitReady;
    this.connection = new PGliteConnection(this.client);
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.lock;
    this.lock = previous.then(() => next);
    await previous;
    this.releaseCurrent = release;

    if (!this.connection) throw new Error("PGlite driver not initialized");
    return this.connection;
  }

  private releaseCurrent: (() => void) | null = null;

  async releaseConnection(): Promise<void> {
    const release = this.releaseCurrent;
    this.releaseCurrent = null;
    release?.();
  }

  async beginTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery({
      sql: "begin",
      parameters: [],
      query: undefined as never,
      queryId: undefined as never,
    });
  }

  async commitTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery({
      sql: "commit",
      parameters: [],
      query: undefined as never,
      queryId: undefined as never,
    });
  }

  async rollbackTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery({
      sql: "rollback",
      parameters: [],
      query: undefined as never,
      queryId: undefined as never,
    });
  }

  async destroy(): Promise<void> {
    await this.client.close();
  }
}

export class PGliteDialect implements Dialect {
  constructor(private readonly client: PGlite) {}

  createAdapter() {
    return new PostgresAdapter();
  }

  createDriver(): Driver {
    return new PGliteDriver(this.client);
  }

  createQueryCompiler() {
    return new PostgresQueryCompiler();
  }

  createIntrospector(db: Kysely<unknown>) {
    return new PostgresIntrospector(db);
  }
}
