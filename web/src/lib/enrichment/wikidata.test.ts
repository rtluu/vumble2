import { describe, expect, it } from "vitest";
import { buildQuery, foldBindings, tagsFromGenres, wikidata } from "./wikidata";

/** Shape SPARQL returns: one row per combination of optional values. */
const bind = (v: Record<string, string>) =>
  Object.fromEntries(Object.entries(v).map(([k, val]) => [k, { value: val }]));

const ENTITY = "http://www.wikidata.org/entity/Q47524071";

describe("licence", () => {
  it("is open, with no retention limit", () => {
    // CC0. If this ever changes to a licensed source, the TTL must be set —
    // see the expiry handling in enrich.ts.
    expect(wikidata.licence).toBe("open");
    expect(wikidata.cacheTtlDays).toBeNull();
    expect(wikidata.accepts).toBe("catalog");
  });
});

describe("buildQuery", () => {
  it("constrains by class so same-named works of other types cannot match", () => {
    // "Chernobyl" is both a 2019 miniseries and a comic strip in Wikidata.
    const q = buildQuery("Chernobyl", 2019, "series");
    expect(q).toContain("wd:Q5398426");
    expect(q).toContain("wd:Q1259759");
    expect(q).not.toContain("wd:Q11424"); // not the film class
  });

  it("matches subclasses transitively", () => {
    // Enumerating leaf classes missed every anime film, which is its own
    // class rather than an instance of Q11424.
    expect(buildQuery("Grave of the Fireflies", 1988, "film")).toContain(
      "wdt:P31/wdt:P279*",
    );
  });

  it("allows a year either side, since release dates disagree by region", () => {
    const q = buildQuery("Arrival", 2016, "film");
    expect(q).toContain("?year = 2016");
    expect(q).toContain("?year = 2015");
    expect(q).toContain("?year = 2017");
  });

  it("omits the year filter when the year is unknown", () => {
    expect(buildQuery("Something", null, "film")).not.toContain("FILTER(?year");
  });

  it("escapes quotes so a title cannot break out of the literal", () => {
    const q = buildQuery('The "Real" Thing', null, "film");
    expect(q).toContain('\\"Real\\"');
    // The literal stays a single well-formed token.
    expect(q.match(/rdfs:label "/g)).toHaveLength(1);
  });

  it("escapes backslashes and strips newlines", () => {
    const q = buildQuery("a\\b\nc", null, "film");
    expect(q).toContain("a\\\\b c");
    expect(q.split("rdfs:label")[1]!.split("@en")[0]).not.toContain("\n");
  });
});

describe("foldBindings", () => {
  it("collapses the cross product into one work", () => {
    const result = foldBindings([
      bind({
        item: ENTITY,
        itemLabel: "Hereditary",
        runtime: "127",
        year: "2018",
        directorLabel: "Ari Aster",
        genreLabel: "horror film",
        imdb: "tt7784604",
      }),
      bind({
        item: ENTITY,
        itemLabel: "Hereditary",
        runtime: "127",
        year: "2018",
        directorLabel: "Ari Aster",
        genreLabel: "psychological thriller",
        imdb: "tt7784604",
      }),
    ]);

    expect(result).toMatchObject({
      canonicalName: "Hereditary",
      creatorName: "Ari Aster",
      // P2047 is minutes; we store seconds.
      runtimeSeconds: 127 * 60,
      year: 2018,
      externalIds: { wikidata: "Q47524071", imdb: "tt7784604" },
    });
    expect(result!.tags).toEqual(["horror", "thriller"]);
  });

  it("prefers the entity whose year matches exactly", () => {
    // "Grave of the Fireflies" is a 1988 anime film and a 2005 TV film.
    // SPARQL guarantees no row ordering, so without this the pick is random.
    const rows = [
      bind({
        item: "http://www.wikidata.org/entity/Q5597803",
        itemLabel: "Grave of the Fireflies",
        year: "2005",
        runtime: "147",
      }),
      bind({
        item: "http://www.wikidata.org/entity/Q274520",
        itemLabel: "Grave of the Fireflies",
        year: "1988",
        runtime: "93",
      }),
    ];

    expect(foldBindings(rows, 1988)!.externalIds?.wikidata).toBe("Q274520");
    expect(foldBindings(rows, 2005)!.externalIds?.wikidata).toBe("Q5597803");
    // With no year to go on, the first entity stands.
    expect(foldBindings(rows)!.externalIds?.wikidata).toBe("Q5597803");
  });

  it("falls back to the first entity when no year matches", () => {
    const rows = [
      bind({
        item: "http://www.wikidata.org/entity/Q1",
        itemLabel: "A",
        year: "1999",
      }),
    ];
    expect(foldBindings(rows, 2020)!.externalIds?.wikidata).toBe("Q1");
  });

  it("ignores rows belonging to a different entity", () => {
    const result = foldBindings([
      bind({ item: ENTITY, itemLabel: "Right One", runtime: "100" }),
      bind({
        item: "http://www.wikidata.org/entity/Q999",
        itemLabel: "Wrong One",
        runtime: "50",
      }),
    ]);
    expect(result!.canonicalName).toBe("Right One");
    expect(result!.runtimeSeconds).toBe(6000);
  });

  it("treats a QID standing in for a label as no label", () => {
    // The label service echoes the QID when no English label exists.
    const result = foldBindings([
      bind({ item: ENTITY, itemLabel: "Q47524071", directorLabel: "Q54864392" }),
    ]);
    expect(result?.canonicalName).toBeUndefined();
    expect(result?.creatorName).toBeUndefined();
  });

  it("returns null on no results", () => {
    expect(foldBindings([])).toBeNull();
  });

  it("rejects malformed identifiers rather than storing them", () => {
    const result = foldBindings([
      bind({ item: ENTITY, itemLabel: "X", imdb: "not-an-imdb-id" }),
    ]);
    expect(result!.externalIds?.imdb).toBeUndefined();
    expect(result!.externalIds?.wikidata).toBe("Q47524071");
  });

  it("ignores nonsense runtimes and years", () => {
    const result = foldBindings([
      bind({ item: ENTITY, itemLabel: "X", runtime: "0", year: "1200" }),
    ]);
    expect(result!.runtimeSeconds).toBeUndefined();
    expect(result!.year).toBeUndefined();
  });

  it("does not treat P18 as poster art", () => {
    // P18 is a general image property. For Arrival it is a 1268x156
    // wordmark, which cropped into a poster frame reads as a broken image.
    // Catalog artwork comes from the trailer thumbnail instead.
    const result = foldBindings([
      bind({
        item: ENTITY,
        itemLabel: "X",
        image: "https://commons.wikimedia.org/wordmark.png",
      }),
    ]);
    expect(result!.posterUrl).toBeUndefined();
  });
});

describe("tagsFromGenres", () => {
  it("maps Wikidata genre labels onto the facet vocabulary", () => {
    expect(tagsFromGenres(["horror film"])).toEqual(["horror"]);
    expect(tagsFromGenres(["science fiction film"])).toEqual(["scifi"]);
    expect(tagsFromGenres(["animated feature film"])).toEqual(["animation"]);
    expect(tagsFromGenres(["biographical film"])).toEqual(["biography"]);
  });

  it("deduplicates and sorts", () => {
    expect(tagsFromGenres(["horror film", "horror movie", "crime film"])).toEqual([
      "crime",
      "horror",
    ]);
  });

  it("drops genres it does not recognise rather than guessing", () => {
    // A wrong tag is worse than a missing one — the vocabulary is controlled
    // and an invented slug would fail the foreign key anyway.
    expect(tagsFromGenres(["chanbara", "kaiju eiga", ""])).toEqual([]);
  });

  it("does not confuse 'war film' with unrelated words containing war", () => {
    expect(tagsFromGenres(["warm drama"])).toEqual(["drama"]);
    expect(tagsFromGenres(["war film"])).toEqual(["war"]);
  });
});

describe("fetch", () => {
  it("declines non-catalog targets and empty names", async () => {
    const asSource = await wikidata.fetch({
      kind: "source",
      platform: "youtube",
      externalId: "x",
      url: "https://y",
    });
    expect(asSource).toBeNull();

    const blank = await wikidata.fetch({
      kind: "catalog",
      name: "   ",
      year: null,
      titleKind: "film",
    });
    expect(blank).toBeNull();
  });
});
