-- Trailers as sources.
--
-- A film's trailer is a real, embeddable video, so it belongs in `sources`
-- rather than in a bolted-on column. But it is emphatically not the work: if
-- a trailer counted as a playable source, every catalog Title would flip to
-- watch mode and the card would offer two minutes of marketing as though it
-- were the film.
--
-- `role` keeps that distinction. Playback and card mode consider only
-- `primary` sources; a `trailer` is a preview shown alongside.

BEGIN;

CREATE TYPE source_role AS ENUM ('primary', 'trailer');

ALTER TABLE sources
  ADD COLUMN role source_role NOT NULL DEFAULT 'primary',
  -- Where the trailer came from: an authoritative identifier, a search, or a
  -- person. Search results can be wrong, so provenance decides how much to
  -- trust one and whether a human should confirm it.
  ADD COLUMN provenance TEXT;

-- One trailer per Title. A second would be ambiguous with no way to choose.
CREATE UNIQUE INDEX sources_one_trailer_idx
  ON sources (title_id) WHERE role = 'trailer';

CREATE INDEX sources_primary_idx ON sources (title_id) WHERE role = 'primary';

COMMIT;
