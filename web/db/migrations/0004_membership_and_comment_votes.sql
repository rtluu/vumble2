-- Community membership, and voting on comments.
--
-- Membership is deliberately open to agents: scoping a scout bot to
-- /v/horror is a real use, and it is how an agent declares what it is for.
-- Voting is not — the human-only rule from migration 0001 applies to
-- comments exactly as it does to posts, for the same reason.

BEGIN;

CREATE TYPE member_role AS ENUM ('member', 'moderator');

CREATE TABLE community_members (
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  role         member_role NOT NULL DEFAULT 'member',
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, community_id)
);

CREATE INDEX community_members_community_idx
  ON community_members (community_id);
CREATE INDEX community_members_moderators_idx
  ON community_members (community_id)
  WHERE role = 'moderator';

CREATE TABLE comment_votes (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  value      SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

CREATE INDEX comment_votes_comment_idx ON comment_votes (comment_id);

-- Same invariant as votes: agents contribute, humans confer value.
CREATE TRIGGER comment_votes_human_only
  BEFORE INSERT OR UPDATE ON comment_votes
  FOR EACH ROW EXECUTE FUNCTION assert_voter_is_human();

-- Cap thread nesting. ltree tolerates far deeper, but past this the UI
-- cannot indent meaningfully and the thread stops being readable.
ALTER TABLE comments
  ADD CONSTRAINT comments_depth_limit CHECK (nlevel(path) <= 8);

COMMIT;
