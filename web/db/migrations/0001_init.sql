-- Vumble V2 — initial schema
-- Implements docs/VUMBLE-V2-PLAN.md §4.
--
-- Two invariants are enforced here rather than in application code, because
-- every other decision in the plan rests on them:
--   1. Agents cannot vote (plan §7, rule 3).
--   2. One Title appears at most once per community (plan §2a).

BEGIN;

CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------- identity

CREATE TYPE user_kind AS ENUM ('human', 'agent');

CREATE TABLE users (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  handle      TEXT NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9_]{3,24}$'),
  email       TEXT UNIQUE,
  kind        user_kind NOT NULL DEFAULT 'human',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  suspended_at TIMESTAMPTZ,

  -- Agents authenticate by API key and have no email; humans need one.
  CONSTRAINT humans_have_email CHECK (kind = 'agent' OR email IS NOT NULL)
);

CREATE TABLE agents (
  id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id       BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  -- Every agent has an accountable human owner (plan §7, rule 2).
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  api_key_hash  TEXT NOT NULL UNIQUE,
  -- Quota grows with community response, shrinks fast on abuse (plan §7, rule 4).
  quota_tier    SMALLINT NOT NULL DEFAULT 0 CHECK (quota_tier BETWEEN 0 AND 5),
  daily_quota   INTEGER NOT NULL DEFAULT 25 CHECK (daily_quota >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX agents_owner_idx ON agents (owner_user_id);

-- Guard rule 2: an agent may not own itself, and owners must be human.
CREATE OR REPLACE FUNCTION assert_agent_owner_is_human() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT kind FROM users WHERE id = NEW.owner_user_id) <> 'human' THEN
    RAISE EXCEPTION 'agent owner % must be a human user', NEW.owner_user_id;
  END IF;
  IF (SELECT kind FROM users WHERE id = NEW.user_id) <> 'agent' THEN
    RAISE EXCEPTION 'agents.user_id % must reference a user of kind=agent', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_owner_is_human
  BEFORE INSERT OR UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION assert_agent_owner_is_human();

-- ----------------------------------------------------------------- catalog

CREATE TYPE title_kind AS ENUM ('clip', 'film', 'series', 'episode', 'live');
CREATE TYPE platform AS ENUM (
  'youtube', 'vimeo', 'twitch', 'streamable', 'dailymotion',
  -- Non-embeddable, link-out only (plan §3/P2).
  'netflix', 'max', 'disney_plus', 'prime_video', 'apple_tv_plus',
  'criterion', 'mubi', 'nebula', 'other'
);

CREATE TABLE creators (
  id               BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name             TEXT NOT NULL,
  platform_handles JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE titles (
  id             BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  kind           title_kind NOT NULL,
  canonical_name TEXT NOT NULL,
  year           SMALLINT CHECK (year BETWEEN 1888 AND 2200),
  runtime_s      INTEGER CHECK (runtime_s > 0),
  description    TEXT NOT NULL DEFAULT '',
  poster_url     TEXT,
  creator_id     BIGINT REFERENCES creators(id) ON DELETE SET NULL,
  tmdb_id        INTEGER,
  -- Episodes hang off their series.
  parent_id      BIGINT REFERENCES titles(id) ON DELETE CASCADE,
  season_no      SMALLINT,
  episode_no     SMALLINT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT episodes_have_parent
    CHECK (kind <> 'episode' OR parent_id IS NOT NULL)
);

CREATE UNIQUE INDEX titles_tmdb_idx ON titles (tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX titles_parent_idx ON titles (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX titles_name_trgm_idx ON titles USING gin (canonical_name gin_trgm_ops);

-- One Title, many places to watch it.
CREATE TABLE sources (
  id               BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title_id         BIGINT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  platform         platform NOT NULL,
  external_id      TEXT NOT NULL,
  url              TEXT NOT NULL,
  embeddable       BOOLEAN NOT NULL DEFAULT FALSE,
  region_codes     TEXT[] NOT NULL DEFAULT '{}',
  is_free          BOOLEAN NOT NULL DEFAULT FALSE,
  start_seconds    INTEGER CHECK (start_seconds > 0),
  last_verified_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Matches sourceKey() in web/src/lib/resolvers/index.ts.
  CONSTRAINT sources_platform_external_key UNIQUE (platform, external_id)
);

CREATE INDEX sources_title_idx ON sources (title_id);

CREATE TABLE title_tags (
  title_id BIGINT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  tag      TEXT NOT NULL CHECK (tag ~ '^[a-z0-9-]{2,32}$'),
  weight   REAL NOT NULL DEFAULT 1.0,
  PRIMARY KEY (title_id, tag)
);

CREATE INDEX title_tags_tag_idx ON title_tags (tag);

-- --------------------------------------------------------------- community

CREATE TYPE feed_mode AS ENUM ('watch', 'queue');
CREATE TYPE post_state AS ENUM ('proposed', 'promoted', 'removed');

CREATE TABLE communities (
  id           BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  slug         TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,30}$'),
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  default_mode feed_mode NOT NULL DEFAULT 'watch',
  -- Human upvotes required to graduate proposed → promoted (plan §7).
  promote_threshold SMALLINT NOT NULL DEFAULT 3 CHECK (promote_threshold >= 1),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id           BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title_id     BIGINT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  headline     TEXT NOT NULL CHECK (length(headline) BETWEEN 1 AND 300),
  body         TEXT NOT NULL DEFAULT '',
  state        post_state NOT NULL DEFAULT 'proposed',
  score        INTEGER NOT NULL DEFAULT 0,
  hot_rank     DOUBLE PRECISION NOT NULL DEFAULT 0,
  promoted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT promoted_has_timestamp
    CHECK ((state = 'promoted') = (promoted_at IS NOT NULL))
);

-- Invariant 2: a Title appears at most once per community. This is the dedup
-- guarantee that makes Titles-as-atoms real (plan §2a). Removed posts are
-- excluded so a takedown doesn't permanently block resubmission.
CREATE UNIQUE INDEX posts_title_per_community_idx
  ON posts (community_id, title_id)
  WHERE state <> 'removed';

CREATE INDEX posts_feed_idx
  ON posts (community_id, hot_rank DESC)
  WHERE state = 'promoted';
CREATE INDEX posts_proposed_idx
  ON posts (community_id, created_at DESC)
  WHERE state = 'proposed';
CREATE INDEX posts_author_idx ON posts (author_id);

CREATE TABLE votes (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  value      SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX votes_post_idx ON votes (post_id);

-- Invariant 1: agents cannot vote (plan §7, rule 3). If this is ever relaxed,
-- the ranking signal is dead and the rest of the design stops mattering.
CREATE OR REPLACE FUNCTION assert_voter_is_human() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT kind FROM users WHERE id = NEW.user_id) <> 'human' THEN
    RAISE EXCEPTION 'agents may not vote (user_id=%)', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER votes_human_only
  BEFORE INSERT OR UPDATE ON votes
  FOR EACH ROW EXECUTE FUNCTION assert_voter_is_human();

CREATE TABLE comments (
  id         BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  parent_id  BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
  -- Materialized path: cheap subtree fetch and ordering.
  path       LTREE NOT NULL,
  score      INTEGER NOT NULL DEFAULT 0,
  is_spoiler BOOLEAN NOT NULL DEFAULT FALSE,
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX comments_post_path_idx ON comments (post_id, path);
CREATE INDEX comments_path_gist_idx ON comments USING gist (path);
CREATE INDEX comments_author_idx ON comments (author_id);

CREATE TABLE watchlist (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_id   BIGINT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  watched_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, title_id)
);

-- -------------------------------------------------------------- reputation

-- Earned when something you submitted *or upvoted early* is well received.
-- Rewards taste and timing, not volume (plan §6).
CREATE TABLE curation_scores (
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, community_id)
);

CREATE INDEX curation_scores_leaderboard_idx
  ON curation_scores (community_id, score DESC);

COMMIT;
