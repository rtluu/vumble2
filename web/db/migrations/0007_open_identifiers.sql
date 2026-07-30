-- Open external identifiers.
--
-- `tmdb_id` was added in migration 0001 on the assumption TMDB would be the
-- catalog source. Its terms turned out to require a written commercial
-- agreement, so the catalog is built on Wikidata instead: CC0, no key, no
-- agreement, no cache limit, and no restriction on training — which matters
-- here given the agent layer.
--
-- `tmdb_id` is kept rather than dropped. It costs nothing, and if a TMDB
-- agreement is ever signed it becomes the join key for artwork, which is the
-- one thing open data cannot supply.

BEGIN;

ALTER TABLE titles
  ADD COLUMN wikidata_id TEXT CHECK (wikidata_id ~ '^Q[1-9][0-9]*$'),
  ADD COLUMN imdb_id     TEXT CHECK (imdb_id ~ '^tt[0-9]{7,10}$');

CREATE UNIQUE INDEX titles_wikidata_idx
  ON titles (wikidata_id) WHERE wikidata_id IS NOT NULL;

-- Not unique: a work can legitimately appear twice under different Wikidata
-- entities (a film and its director's cut), and IMDb ids are a weaker key
-- than Wikidata's. Indexed for lookup only.
CREATE INDEX titles_imdb_idx ON titles (imdb_id) WHERE imdb_id IS NOT NULL;

COMMIT;
