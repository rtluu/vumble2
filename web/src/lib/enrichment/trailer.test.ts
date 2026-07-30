import { describe, expect, it } from "vitest";
import { findTrailer, verifyCandidate } from "./trailer";

const ARRIVAL = { name: "Arrival", year: 2016 };

describe("verifyCandidate", () => {
  it("accepts a real official trailer", () => {
    // Both taken verbatim from live Piped results.
    expect(
      verifyCandidate({ title: "Arrival Trailer (2016) - Paramount Pictures" }, ARRIVAL),
    ).toBe(true);
    expect(
      verifyCandidate({ title: "Hereditary | Official Trailer HD | A24" }, {
        name: "Hereditary",
        year: 2018,
      }),
    ).toBe(true);
  });

  it("requires the work's name", () => {
    expect(
      verifyCandidate({ title: "Some Other Film - Official Trailer" }, ARRIVAL),
    ).toBe(false);
  });

  it("requires it to actually be a trailer", () => {
    // A clip or featurette is not a preview of the whole work.
    expect(verifyCandidate({ title: "Arrival - opening scene" }, ARRIVAL)).toBe(false);
    expect(verifyCandidate({ title: "Arrival (2016)" }, ARRIVAL)).toBe(false);
  });

  it("rejects the reaction and commentary content search is full of", () => {
    for (const title of [
      "Arrival Trailer REACTION",
      "Arrival (2016) Trailer Breakdown",
      "Arrival Official Trailer - Honest Trailers",
      "Arrival trailer explained",
      "Arrival Trailer - Fan Made",
    ]) {
      expect(verifyCandidate({ title }, ARRIVAL), title).toBe(false);
    }
  });

  it("rejects a same-named release from another year", () => {
    // A remake's trailer matches the name and the word trailer perfectly.
    expect(
      verifyCandidate({ title: "Arrival Official Trailer (1996)" }, ARRIVAL),
    ).toBe(false);
    // A year within one is fine — festival and general release differ.
    expect(
      verifyCandidate({ title: "Arrival Official Trailer (2017)" }, ARRIVAL),
    ).toBe(true);
  });

  it("ignores punctuation and case differences", () => {
    expect(
      verifyCandidate(
        { title: "WALL·E — OFFICIAL TRAILER" },
        { name: "WALL-E", year: null },
      ),
    ).toBe(true);
  });

  it("rejects empty input rather than matching everything", () => {
    expect(verifyCandidate({ title: "" }, ARRIVAL)).toBe(false);
    expect(verifyCandidate({ title: "Trailer" }, { name: "", year: null })).toBe(false);
  });

  it("does not require a year when the work has none", () => {
    expect(
      verifyCandidate({ title: "The Wicker Man Official Trailer (1973)" }, {
        name: "The Wicker Man",
        year: null,
      }),
    ).toBe(true);
  });
});

describe("findTrailer", () => {
  it("rejects a Wikidata id that is not actually a trailer", async () => {
    // P1651 is "YouTube video ID", not "trailer". For Arrival it points at
    // the YouTube Movies listing — the paid full film, titled just "Arrival".
    // Embedding that behind a Trailer label would show a purchase gate.
    expect(verifyCandidate({ title: "Arrival" }, ARRIVAL)).toBe(false);

    const result = await findTrailer(ARRIVAL, {
      wikidataVideoId: "4NNeksFtulA",
      instances: [], // no search available, so this must come back null
    });
    expect(result).toBeNull();
  });

  it("ignores a malformed Wikidata id and falls through", async () => {
    const result = await findTrailer(ARRIVAL, {
      wikidataVideoId: "not-an-id",
      instances: [],
    });
    expect(result).toBeNull();
  });

  it("returns null when every instance is unreachable", async () => {
    // Volunteer-run instances go down; that must degrade to "no trailer"
    // rather than failing enrichment.
    const result = await findTrailer(ARRIVAL, {
      instances: ["https://invalid.invalid", "https://also-invalid.invalid"],
    });
    expect(result).toBeNull();
  });
});
