-- Enrichment tracking.
--
-- A submitted Title starts with the submitter's headline standing in for its
-- canonical name, because a URL alone does not tell us what the work is
-- called. Enrichment replaces that with the real name, runtime, author, and
-- artwork. `enriched_at IS NULL` is the signal that a name is still a
-- placeholder.
--
-- The expiry column exists for a licensing reason, not a performance one.
-- TMDB's API terms cap caching at six months, so anything sourced from a
-- licensed provider has to carry a hard expiry. Making that a column rather
-- than a convention means compliance does not depend on someone remembering
-- it — a sweep for expired rows is a query, and the rule is visible in the
-- schema to whoever reads it next.
--
-- oEmbed data (YouTube, Vimeo, Dailymotion) carries no such restriction and
-- gets a null expiry.

BEGIN;

ALTER TABLE titles
  ADD COLUMN enriched_at           TIMESTAMPTZ,
  ADD COLUMN enrichment_provider   TEXT,
  ADD COLUMN enrichment_expires_at TIMESTAMPTZ,
  -- Consecutive failures. Lets the runner back off a permanently dead URL
  -- instead of retrying it on every sweep.
  ADD COLUMN enrichment_failures   SMALLINT NOT NULL DEFAULT 0;

-- The work queue: never enriched, or enriched from data we may no longer keep.
CREATE INDEX titles_need_enrichment_idx
  ON titles (created_at)
  WHERE enriched_at IS NULL;

CREATE INDEX titles_enrichment_expiry_idx
  ON titles (enrichment_expires_at)
  WHERE enrichment_expires_at IS NOT NULL;

COMMIT;
