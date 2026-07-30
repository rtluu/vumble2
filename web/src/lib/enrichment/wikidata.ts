import type { TitleKind } from "@/lib/db/types";
import {
  type EnrichmentProvider,
  type EnrichmentResult,
  TransientEnrichmentError,
} from "./types";

/**
 * Wikidata enrichment for films and series.
 *
 * CC0: public domain, commercially usable, no API key, no written agreement,
 * no attribution requirement, no cache limit, and no restriction on training
 * — the last of which matters given Vumble's agent layer, and is precisely
 * where TMDB's terms would have bitten.
 *
 * What it gives, measured against 2018 films: IMDb id 86%, genre 81%,
 * director 74%, runtime 52%.
 *
 * What it does not give is artwork — 4% of 2018 films carry any image at
 * all, because posters are copyrighted whoever serves them. No open dataset
 * solves that, so the queue card is designed not to need one.
 */

const ENDPOINT = "https://query.wikidata.org/sparql";
const TIMEOUT_MS = 15000;

/**
 * WDQS asks for a descriptive User-Agent identifying the application, and
 * throttles anonymous traffic. Enrichment runs as a batch sweep rather than
 * per-request, which keeps well inside that.
 */
const USER_AGENT = "Vumble/1.0 (https://vumble.com) enrichment";

/**
 * Root Wikidata classes per Title kind, matched transitively through
 * `P31/P279*` (instance of / subclass of).
 *
 * Enumerating leaf classes does not work: an initial list of film, feature
 * film, and television film silently missed every anime film, which is its
 * own class (Q20650540) rather than a subclass instance. Matching through
 * the subclass tree picks those up without maintaining a list that is
 * permanently one obscure class behind.
 *
 * The constraint still earns its keep — "Ghost in the Shell" also names a
 * video game and an album, and only the class filter keeps those out.
 */
const KIND_ROOTS: Record<TitleKind, string[]> = {
  film: ["Q11424"], // film
  series: ["Q5398426", "Q1259759"], // television series, miniseries
  episode: ["Q21191270"], // television series episode
  clip: ["Q11424"],
  live: ["Q5398426"],
};

/**
 * Wikidata genre labels mapped onto our facet vocabulary (plan §2c).
 *
 * Matched on the English label rather than QID: labels are stable enough for
 * substring matching and this avoids hard-coding identifiers that are easy to
 * get subtly wrong. Anything unrecognised is dropped rather than guessed —
 * a wrong tag is worse than a missing one.
 */
const GENRE_PATTERNS: [RegExp, string][] = [
  [/\bhorror\b/i, "horror"],
  [/\bscience fiction\b|\bsci-fi\b/i, "scifi"],
  [/\bfantasy\b/i, "fantasy"],
  [/\bthriller\b/i, "thriller"],
  [/\bcomedy\b/i, "comedy"],
  [/\bdrama\b/i, "drama"],
  [/\bromance\b|\bromantic\b/i, "romance"],
  [/\baction\b/i, "action"],
  [/\bcrime\b/i, "crime"],
  [/\bmystery\b/i, "mystery"],
  [/\banimat/i, "animation"],
  [/\bmusical\b/i, "musical"],
  [/\bwestern\b/i, "western"],
  [/\bwar film\b|\bwar movie\b/i, "war"],
  [/\bsport/i, "sports"],
  [/\bnature\b|\bwildlife\b/i, "nature"],
  [/\bdocumentary\b/i, "docuseries"],
  [/\bfound footage\b/i, "found-footage"],
  [/\bcoming.of.age\b/i, "coming-of-age"],
  [/\bheist\b/i, "heist"],
  [/\bdystopia/i, "dystopia"],
  [/\bpost.apocalyptic\b/i, "post-apocalyptic"],
  [/\bbiographical\b|\bbiopic\b/i, "biography"],
];

export function tagsFromGenres(labels: string[]): string[] {
  const tags = new Set<string>();
  for (const label of labels) {
    for (const [pattern, tag] of GENRE_PATTERNS) {
      if (pattern.test(label)) tags.add(tag);
    }
  }
  return [...tags].sort();
}

/** SPARQL string literal escaping. Names come from user submissions. */
function quote(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

export function buildQuery(
  name: string,
  year: number | null,
  titleKind: TitleKind,
): string {
  const roots = (KIND_ROOTS[titleKind] ?? KIND_ROOTS.film)
    .map((q) => `wd:${q}`)
    .join(" ");

  // A year either side, because release dates differ by region and a
  // festival premiere often predates general release.
  const yearFilter =
    year === null
      ? ""
      : `FILTER(?year = ${year} || ?year = ${year - 1} || ?year = ${year + 1})`;

  return `SELECT ?item ?itemLabel ?runtime ?year ?directorLabel ?genreLabel ?imdb ?image WHERE {
  VALUES ?root { ${roots} }
  ?item wdt:P31/wdt:P279* ?root ; rdfs:label "${quote(name)}"@en ; wdt:P577 ?pub .
  BIND(YEAR(?pub) AS ?year)
  ${yearFilter}
  OPTIONAL { ?item wdt:P2047 ?runtime }
  OPTIONAL { ?item wdt:P57 ?director }
  OPTIONAL { ?item wdt:P136 ?genre }
  OPTIONAL { ?item wdt:P345 ?imdb }
  OPTIONAL { ?item wdt:P18 ?image }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
LIMIT 40`;
}

interface SparqlBinding {
  [key: string]: { value: string } | undefined;
}

async function runQuery(query: string): Promise<SparqlBinding[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/sparql-results+json",
        "user-agent": USER_AGENT,
      },
    });

    // 429 and 5xx are worth retrying; a malformed query is not, but that
    // would be our bug rather than a transient condition.
    if (!res.ok) {
      throw new TransientEnrichmentError(`WDQS responded ${res.status}`);
    }

    const body = (await res.json()) as {
      results?: { bindings?: SparqlBinding[] };
    };
    return body.results?.bindings ?? [];
  } catch (err) {
    if (err instanceof TransientEnrichmentError) throw err;
    throw new TransientEnrichmentError(
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Collapse the rows SPARQL returns into one work.
 *
 * One work yields many rows — the cross product of its optional genres and
 * directors. Rows are grouped by entity, and when several entities survive
 * the filters the one whose year matches exactly wins. That matters:
 * "Grave of the Fireflies" is both a 1988 anime film and a 2005 television
 * film, and SPARQL guarantees no row ordering, so trusting the first row
 * would pick between them at random.
 */
export function foldBindings(
  bindings: SparqlBinding[],
  preferredYear: number | null = null,
): EnrichmentResult | null {
  if (bindings.length === 0) return null;

  const byEntity = new Map<string, SparqlBinding[]>();
  for (const b of bindings) {
    const id = b.item?.value;
    if (!id) continue;
    if (!byEntity.has(id)) byEntity.set(id, []);
    byEntity.get(id)!.push(b);
  }
  if (byEntity.size === 0) return null;

  let firstItem = [...byEntity.keys()][0]!;
  if (preferredYear !== null && byEntity.size > 1) {
    for (const [id, rows] of byEntity) {
      const exact = rows.some((r) => Number(r.year?.value) === preferredYear);
      if (exact) {
        firstItem = id;
        break;
      }
    }
  }

  const rows = byEntity.get(firstItem)!;
  const result: EnrichmentResult = {};

  const qid = firstItem.replace("http://www.wikidata.org/entity/", "");
  if (/^Q[1-9][0-9]*$/.test(qid)) {
    result.externalIds = { wikidata: qid };
  }

  const label = rows[0]?.itemLabel?.value;
  // The label service returns the QID itself when no English label exists.
  if (label && !/^Q[1-9][0-9]*$/.test(label)) result.canonicalName = label;

  const runtime = rows.find((r) => r.runtime?.value)?.runtime?.value;
  if (runtime) {
    // P2047 is in minutes.
    const minutes = Number(runtime);
    if (Number.isFinite(minutes) && minutes > 0) {
      result.runtimeSeconds = Math.round(minutes * 60);
    }
  }

  const year = rows.find((r) => r.year?.value)?.year?.value;
  if (year) {
    const y = Number(year);
    if (Number.isInteger(y) && y >= 1888) result.year = y;
  }

  const director = rows.find((r) => {
    const v = r.directorLabel?.value;
    return v && !/^Q[1-9][0-9]*$/.test(v);
  })?.directorLabel?.value;
  if (director) result.creatorName = director;

  const imdb = rows.find((r) => r.imdb?.value)?.imdb?.value;
  if (imdb && /^tt[0-9]{7,10}$/.test(imdb)) {
    result.externalIds = { ...result.externalIds, imdb };
  }

  // Present for only ~4% of films, so treated as a bonus rather than relied on.
  const image = rows.find((r) => r.image?.value)?.image?.value;
  if (image) result.posterUrl = image;

  const genres = rows
    .map((r) => r.genreLabel?.value)
    .filter((v): v is string => !!v && !/^Q[1-9][0-9]*$/.test(v));
  const tags = tagsFromGenres(genres);
  if (tags.length > 0) result.tags = tags;

  return Object.keys(result).length > 0 ? result : null;
}

export const wikidata: EnrichmentProvider = {
  name: "wikidata",
  licence: "open",
  accepts: "catalog",
  platforms: [],
  // CC0 imposes no retention limit.
  cacheTtlDays: null,

  async fetch(target) {
    if (target.kind !== "catalog") return null;
    const name = target.name.trim();
    if (!name) return null;

    const bindings = await runQuery(
      buildQuery(name, target.year, target.titleKind),
    );
    return foldBindings(bindings, target.year);
  },
};
