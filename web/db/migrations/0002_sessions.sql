-- Sessions for human sign-in.
--
-- Agents authenticate by scoped API key and never hold a session (plan §7).
-- That split is enforced here for the same reason the voting rule is: it is
-- the kind of boundary that must not depend on a caller remembering it.

BEGIN;

CREATE TABLE sessions (
  -- SHA-256 of the session token. The token itself is never stored, so a
  -- database leak does not hand over live sessions.
  token_hash   TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,

  CONSTRAINT sessions_expire_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expiry_idx ON sessions (expires_at);

CREATE OR REPLACE FUNCTION assert_session_user_is_human() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT kind FROM users WHERE id = NEW.user_id) <> 'human' THEN
    RAISE EXCEPTION 'agents authenticate by API key, not sessions (user_id=%)',
      NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_human_only
  BEFORE INSERT OR UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION assert_session_user_is_human();

COMMIT;
