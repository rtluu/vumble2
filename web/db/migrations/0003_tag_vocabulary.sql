-- A controlled, faceted tag vocabulary.
--
-- This is the Netflix layer. Netflix enumerates tens of thousands of
-- micro-genres ("Quirky Dark Comedies with a Strong Female Lead"); the same
-- expressiveness falls out of a handful of orthogonal facets composed
-- together, without anyone maintaining the cross-product.
--
-- Tags are for retrieval. Communities are for conversation. Keeping them
-- separate is deliberate: `drama` is a useful filter and a dead community,
-- while `horror` is both. See docs/VUMBLE-V2-PLAN.md §2c.
--
-- The vocabulary is controlled (title_tags FKs into it) because open
-- folksonomies drift — you end up with scifi, sci-fi, and science-fiction
-- splitting the same shelf three ways.

BEGIN;

CREATE TYPE facet AS ENUM (
  'genre',   -- what it is:        horror, scifi, comedy
  'format',  -- how it is shaped:  feature, limited-series, short, standup-special
  'origin',  -- where it is from:  korean, nordic, british
  'mood',    -- how it feels:      bleak, cozy, mind-bending
  'theme'    -- what it is about:  coming-of-age, heist, time-loop
);

CREATE TABLE tags (
  slug        TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,31}$'),
  facet       facet NOT NULL,
  label       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tags_facet_idx ON tags (facet);

-- Point the existing tag rows at the vocabulary. The table is empty at this
-- point in the project's life, so no backfill is needed; were it not, this
-- would need an insert-missing-tags step before the constraint.
ALTER TABLE title_tags
  ADD CONSTRAINT title_tags_tag_fkey
  FOREIGN KEY (tag) REFERENCES tags(slug) ON UPDATE CASCADE ON DELETE RESTRICT;

-- ------------------------------------------------------------- vocabulary

INSERT INTO tags (slug, facet, label) VALUES
  -- genre
  ('horror',        'genre',  'Horror'),
  ('scifi',         'genre',  'Science Fiction'),
  ('fantasy',       'genre',  'Fantasy'),
  ('thriller',      'genre',  'Thriller'),
  ('comedy',        'genre',  'Comedy'),
  ('drama',         'genre',  'Drama'),
  ('romance',       'genre',  'Romance'),
  ('action',        'genre',  'Action'),
  ('crime',         'genre',  'Crime'),
  ('mystery',       'genre',  'Mystery'),
  ('animation',     'genre',  'Animation'),
  ('musical',       'genre',  'Musical'),
  ('western',       'genre',  'Western'),
  ('war',           'genre',  'War'),
  ('sports',        'genre',  'Sports'),
  ('nature',        'genre',  'Nature'),
  ('true-crime',    'genre',  'True Crime'),

  -- format
  ('feature',          'format', 'Feature'),
  ('short',            'format', 'Short'),
  ('limited-series',   'format', 'Limited Series'),
  ('ongoing-series',   'format', 'Ongoing Series'),
  ('anthology',        'format', 'Anthology'),
  ('docuseries',       'format', 'Docuseries'),
  ('standup-special',  'format', 'Standup Special'),
  ('video-essay',      'format', 'Video Essay'),
  ('concert-film',     'format', 'Concert Film'),
  ('live-session',     'format', 'Live Session'),

  -- origin
  ('korean',        'origin', 'Korean'),
  ('japanese',      'origin', 'Japanese'),
  ('british',       'origin', 'British'),
  ('french',        'origin', 'French'),
  ('nordic',        'origin', 'Nordic'),
  ('indian',        'origin', 'Indian'),
  ('latin-american','origin', 'Latin American'),
  ('spanish',       'origin', 'Spanish'),
  ('american',      'origin', 'American'),

  -- mood
  ('bleak',         'mood',   'Bleak'),
  ('cozy',          'mood',   'Cozy'),
  ('mind-bending',  'mood',   'Mind-bending'),
  ('slow-burn',     'mood',   'Slow burn'),
  ('tense',         'mood',   'Tense'),
  ('feel-good',     'mood',   'Feel-good'),
  ('unsettling',    'mood',   'Unsettling'),
  ('cathartic',     'mood',   'Cathartic'),
  ('quirky',        'mood',   'Quirky'),
  ('meditative',    'mood',   'Meditative'),

  -- theme
  ('coming-of-age', 'theme',  'Coming of age'),
  ('survival',      'theme',  'Survival'),
  ('heist',         'theme',  'Heist'),
  ('revenge',       'theme',  'Revenge'),
  ('found-footage', 'theme',  'Found footage'),
  ('time-loop',     'theme',  'Time loop'),
  ('dystopia',      'theme',  'Dystopia'),
  ('folk-horror',   'theme',  'Folk horror'),
  ('space',         'theme',  'Space'),
  ('post-apocalyptic', 'theme', 'Post-apocalyptic'),
  ('biography',     'theme',  'Biography'),
  ('archival',      'theme',  'Archival');

COMMIT;
