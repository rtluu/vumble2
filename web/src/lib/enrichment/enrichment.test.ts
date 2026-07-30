import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db } from "@/lib/db/client";
import { submitUrl } from "@/lib/submit/submit";
import {
  enrichPending,
  enrichTitle,
  providerFor,
  purgeExpiredLicensedData,
} from "./enrich";
import { __internals } from "./oembed";
import {
  type EnrichmentProvider,
  TransientEnrichmentError,
} from "./types";

let db: Db;
let alice: number;

/** A provider that returns whatever the test wants, without touching the network. */
function fakeProvider(
  impl: EnrichmentProvider["fetch"],
  overrides: Partial<EnrichmentProvider> = {},
): EnrichmentProvider {
  return {
    name: "fake",
    licence: "open",
    accepts: "source",
    platforms: ["youtube"],
    cacheTtlDays: null,
    fetch: impl,
    ...overrides,
  };
}

async function submit(n: number) {
  const res = await submitUrl(db, {
    url: `https://www.youtube.com/watch?v=${String(n).padStart(11, "a")}`,
    communitySlug: "horror",
    authorId: alice,
    headline: `Submitter headline ${n}`,
  });
  if (!res.ok) throw new Error("setup failed");
  return res;
}

beforeEach(async () => {
  db = await createTestDb();
  await db
    .insertInto("communities")
    .values({ slug: "horror", name: "Horror", promote_threshold: 2 })
    .execute();
  const u = await db
    .insertInto("users")
    .values({ handle: "alice", email: "alice@example.test", kind: "human" })
    .returning("id")
    .executeTakeFirstOrThrow();
  alice = u.id;
}, 60_000);

describe("oEmbed response mapping", () => {
  it("maps a full response", () => {
    const res = __internals.toResult({
      title: "Me at the zoo",
      author_name: "jawed",
      thumbnail_url: "https://i.ytimg.com/vi/x/hqdefault.jpg",
      duration: 19,
      width: 640,
      height: 360,
      upload_date: "2005-04-23",
    });
    expect(res).toEqual({
      canonicalName: "Me at the zoo",
      creatorName: "jawed",
      posterUrl: "https://i.ytimg.com/vi/x/hqdefault.jpg",
      runtimeSeconds: 19,
      width: 640,
      height: 360,
      year: 2005,
    });
  });

  it("rejects placeholder titles platforms emit when they have nothing", () => {
    for (const title of ["Video", "video", "Untitled", "  ", ""]) {
      expect(__internals.usableTitle(title)).toBeUndefined();
    }
    expect(__internals.usableTitle("  Real Title  ")).toBe("Real Title");
  });

  it("treats an empty payload as a miss, not an enrichment", () => {
    expect(__internals.toResult({})).toBeNull();
    expect(__internals.toResult({ title: "Video" })).toBeNull();
  });

  it("ignores nonsense durations and years", () => {
    const res = __internals.toResult({
      title: "Ok",
      duration: 0,
      upload_date: "0001-01-01",
    });
    expect(res?.runtimeSeconds).toBeUndefined();
    expect(res?.year).toBeUndefined();
  });
});

describe("enrichTitle", () => {
  it("replaces the placeholder name and records the provider", async () => {
    const { titleId } = await submit(1);

    const before = await db
      .selectFrom("titles")
      .select(["canonical_name", "enriched_at"])
      .where("id", "=", titleId)
      .executeTakeFirstOrThrow();
    expect(before.canonical_name).toBe("Submitter headline 1");
    expect(before.enriched_at).toBeNull();

    const outcome = await enrichTitle(db, titleId, [
      fakeProvider(async () => ({
        canonicalName: "The Real Title",
        creatorName: "A Creator",
        runtimeSeconds: 212,
        posterUrl: "https://example.test/p.jpg",
        year: 2011,
      })),
    ]);

    expect(outcome.status).toBe("enriched");

    const after = await db
      .selectFrom("titles")
      .selectAll()
      .where("id", "=", titleId)
      .executeTakeFirstOrThrow();
    expect(after.canonical_name).toBe("The Real Title");
    expect(after.runtime_s).toBe(212);
    expect(after.year).toBe(2011);
    expect(after.enriched_at).not.toBeNull();
    expect(after.enrichment_provider).toBe("fake");
    // Open-licence data carries no expiry.
    expect(after.enrichment_expires_at).toBeNull();
  });

  it("reuses an existing creator rather than duplicating", async () => {
    const a = await submit(1);
    const b = await submit(2);
    const provider = fakeProvider(async () => ({
      canonicalName: "X",
      creatorName: "Shared Creator",
    }));

    await enrichTitle(db, a.titleId, [provider]);
    await enrichTitle(db, b.titleId, [provider]);

    const creators = await db.selectFrom("creators").selectAll().execute();
    expect(creators).toHaveLength(1);

    const titles = await db
      .selectFrom("titles")
      .select("creator_id")
      .where("id", "in", [a.titleId, b.titleId])
      .execute();
    expect(titles[0]!.creator_id).toBe(titles[1]!.creator_id);
  });

  it("stamps an expiry for licensed providers", async () => {
    const { titleId } = await submit(1);

    await enrichTitle(db, titleId, [
      fakeProvider(async () => ({ canonicalName: "Licensed Work" }), {
        name: "tmdb",
        licence: "licensed",
        cacheTtlDays: 180, // TMDB's cap
      }),
    ]);

    const row = await db
      .selectFrom("titles")
      .select(["enrichment_expires_at", "enrichment_provider"])
      .where("id", "=", titleId)
      .executeTakeFirstOrThrow();

    expect(row.enrichment_provider).toBe("tmdb");
    const expires = new Date(row.enrichment_expires_at as unknown as string);
    const days = (expires.getTime() - Date.now()) / 86400_000;
    expect(days).toBeGreaterThan(179);
    expect(days).toBeLessThan(181);
  });

  it("counts a miss and leaves the Title usable", async () => {
    const { titleId } = await submit(1);

    const outcome = await enrichTitle(db, titleId, [
      fakeProvider(async () => null),
    ]);
    expect(outcome.status).toBe("miss");

    const row = await db
      .selectFrom("titles")
      .select(["canonical_name", "enriched_at", "enrichment_failures"])
      .where("id", "=", titleId)
      .executeTakeFirstOrThrow();
    // Still perfectly usable — the headline stands in.
    expect(row.canonical_name).toBe("Submitter headline 1");
    expect(row.enriched_at).toBeNull();
    expect(row.enrichment_failures).toBe(1);
  });

  it("defers on a transient failure without marking the Title enriched", async () => {
    const { titleId } = await submit(1);

    const outcome = await enrichTitle(db, titleId, [
      fakeProvider(async () => {
        throw new TransientEnrichmentError("upstream 503");
      }),
    ]);

    expect(outcome.status).toBe("retry_later");
    const row = await db
      .selectFrom("titles")
      .select(["enriched_at", "enrichment_failures"])
      .where("id", "=", titleId)
      .executeTakeFirstOrThrow();
    expect(row.enriched_at).toBeNull();
    expect(row.enrichment_failures).toBe(1);
  });

  it("routes a sourceless Title to a catalog provider, by name and year", async () => {
    const t = await db
      .insertInto("titles")
      .values({ kind: "film", canonical_name: "Some Film", year: 1999 })
      .returning("id")
      .executeTakeFirstOrThrow();

    let seen: unknown;
    const outcome = await enrichTitle(db, t.id, [
      fakeProvider(
        async (target) => {
          seen = target;
          return { canonicalName: "Some Film", runtimeSeconds: 5400 };
        },
        { name: "fake-catalog", accepts: "catalog", platforms: [] },
      ),
    ]);

    expect(outcome.status).toBe("enriched");
    expect(seen).toEqual({
      kind: "catalog",
      name: "Some Film",
      year: 1999,
      titleKind: "film",
    });
  });

  it("reports no_provider when nothing serves catalog Titles", async () => {
    const t = await db
      .insertInto("titles")
      .values({ kind: "film", canonical_name: "Some Film", year: 1999 })
      .returning("id")
      .executeTakeFirstOrThrow();

    // Only a source provider available; a sourceless Title cannot use it.
    const outcome = await enrichTitle(db, t.id, [
      fakeProvider(async () => ({ canonicalName: "x" })),
    ]);
    expect(outcome.status).toBe("no_provider");
  });

  it("applies inferred tags at a lower weight than hand-applied ones", async () => {
    const { titleId } = await submit(1);

    await enrichTitle(db, titleId, [
      fakeProvider(async () => ({
        canonicalName: "Tagged",
        tags: ["horror", "slow-burn"],
      })),
    ]);

    const tags = await db
      .selectFrom("title_tags")
      .select(["tag", "weight"])
      .where("title_id", "=", titleId)
      .orderBy("tag")
      .execute();

    expect(tags.map((t) => t.tag)).toEqual(["horror", "slow-burn"]);
    for (const t of tags) expect(t.weight).toBeLessThan(1);
  });

  it("drops inferred tags outside the controlled vocabulary", async () => {
    const { titleId } = await submit(1);

    const outcome = await enrichTitle(db, titleId, [
      fakeProvider(async () => ({
        canonicalName: "Tagged",
        tags: ["horror", "not-a-real-tag"],
      })),
    ]);

    // The unknown slug is filtered before insert rather than blowing up the
    // whole enrichment on a foreign-key violation.
    expect(outcome.status).toBe("enriched");
    const tags = await db
      .selectFrom("title_tags")
      .select("tag")
      .where("title_id", "=", titleId)
      .execute();
    expect(tags.map((t) => t.tag)).toEqual(["horror"]);
  });

  it("does not overwrite a tag a human already applied", async () => {
    const { titleId } = await submit(1);
    await db
      .insertInto("title_tags")
      .values({ title_id: titleId, tag: "horror", weight: 1.0 })
      .execute();

    await enrichTitle(db, titleId, [
      fakeProvider(async () => ({ canonicalName: "T", tags: ["horror"] })),
    ]);

    const row = await db
      .selectFrom("title_tags")
      .select("weight")
      .where("title_id", "=", titleId)
      .where("tag", "=", "horror")
      .executeTakeFirstOrThrow();
    expect(row.weight).toBe(1);
  });

  it("stores open external identifiers", async () => {
    const { titleId } = await submit(1);

    await enrichTitle(db, titleId, [
      fakeProvider(async () => ({
        canonicalName: "Identified",
        externalIds: { wikidata: "Q47524071", imdb: "tt7784604" },
      })),
    ]);

    const row = await db
      .selectFrom("titles")
      .select(["wikidata_id", "imdb_id"])
      .where("id", "=", titleId)
      .executeTakeFirstOrThrow();
    expect(row.wikidata_id).toBe("Q47524071");
    expect(row.imdb_id).toBe("tt7784604");
  });

  it("reports no_provider for platforms nothing covers", async () => {
    const { titleId } = await submit(1);
    const outcome = await enrichTitle(db, titleId, [
      fakeProvider(async () => ({ canonicalName: "x" }), {
        platforms: ["vimeo"],
      }),
    ]);
    expect(outcome.status).toBe("no_provider");
  });
});

describe("enrichPending", () => {
  it("picks up unenriched Titles and skips ones already done", async () => {
    await submit(1);
    await submit(2);
    const provider = fakeProvider(async () => ({ canonicalName: "Done" }));

    const first = await enrichPending(db, { providers: [provider] });
    expect(first.considered).toBe(2);
    expect(first.enriched).toBe(2);

    const second = await enrichPending(db, { providers: [provider] });
    expect(second.considered).toBe(0);
  });

  it("re-enriches Titles whose licensed cache has expired", async () => {
    const { titleId } = await submit(1);
    const provider = fakeProvider(async () => ({ canonicalName: "Fresh" }));

    await enrichTitle(db, titleId, [provider]);
    await db
      .updateTable("titles")
      .set({ enrichment_expires_at: new Date(Date.now() - 1000) })
      .where("id", "=", titleId)
      .execute();

    const sweep = await enrichPending(db, { providers: [provider] });
    expect(sweep.considered).toBe(1);
    expect(sweep.enriched).toBe(1);
  });

  it("gives up on a Title that keeps failing", async () => {
    const { titleId } = await submit(1);
    const dead = fakeProvider(async () => null);

    for (let i = 0; i < 5; i++) {
      await enrichTitle(db, titleId, [dead]);
    }

    const sweep = await enrichPending(db, { providers: [dead] });
    expect(sweep.considered).toBe(0);
  });

  it("honours the limit", async () => {
    for (let i = 1; i <= 4; i++) await submit(i);
    const sweep = await enrichPending(db, {
      limit: 2,
      providers: [fakeProvider(async () => ({ canonicalName: "X" }))],
    });
    expect(sweep.considered).toBe(2);
  });
});

describe("purgeExpiredLicensedData", () => {
  it("clears licensed data that outlived its window and could not refresh", async () => {
    const { titleId } = await submit(1);

    await enrichTitle(db, titleId, [
      fakeProvider(async () => ({
        canonicalName: "Licensed",
        posterUrl: "https://image.tmdb.org/x.jpg",
      }), { name: "tmdb", licence: "licensed", cacheTtlDays: 180 }),
    ]);

    // Expired, and refresh has been failing.
    await db
      .updateTable("titles")
      .set({
        enrichment_expires_at: new Date(Date.now() - 1000),
        enrichment_failures: 5,
      })
      .where("id", "=", titleId)
      .execute();

    expect(await purgeExpiredLicensedData(db)).toBe(1);

    const row = await db
      .selectFrom("titles")
      .select(["poster_url", "enriched_at", "enrichment_provider"])
      .where("id", "=", titleId)
      .executeTakeFirstOrThrow();
    expect(row.poster_url).toBeNull();
    expect(row.enriched_at).toBeNull();
    expect(row.enrichment_provider).toBeNull();
  });

  it("leaves open-licence data alone forever", async () => {
    const { titleId } = await submit(1);
    await enrichTitle(db, titleId, [
      fakeProvider(async () => ({ canonicalName: "Open", posterUrl: "https://x/y.jpg" })),
    ]);

    expect(await purgeExpiredLicensedData(db)).toBe(0);
    const row = await db
      .selectFrom("titles")
      .select("poster_url")
      .where("id", "=", titleId)
      .executeTakeFirstOrThrow();
    expect(row.poster_url).toBe("https://x/y.jpg");
  });
});

describe("provider registry", () => {
  it("covers the embeddable platforms and nothing it cannot serve", () => {
    expect(providerFor("youtube")?.name).toBe("youtube-oembed");
    expect(providerFor("vimeo")?.name).toBe("vimeo-oembed");
    expect(providerFor("dailymotion")?.name).toBe("dailymotion-oembed");
    // No provider yet for the non-embeddable platforms — that is the TMDB gap.
    expect(providerFor("netflix")).toBeNull();
  });

  it("marks oEmbed providers as unrestricted", () => {
    for (const platform of ["youtube", "vimeo", "dailymotion"] as const) {
      const p = providerFor(platform)!;
      expect(p.licence).toBe("open");
      expect(p.cacheTtlDays).toBeNull();
    }
  });
});
