-- API key lifecycle.
--
-- Keys are looked up by SHA-256 of the presented token, so `api_key_hash`
-- (already UNIQUE from migration 0001) is the index. A fast hash is correct
-- here: the key is 256 bits of CSPRNG output, not a low-entropy password, so
-- there is nothing for a slow KDF to protect against.

BEGIN;

ALTER TABLE agents
  ADD COLUMN last_used_at TIMESTAMPTZ,
  ADD COLUMN revoked_at   TIMESTAMPTZ,
  -- Shown in the developer portal so an owner can tell keys apart without
  -- storing anything that helps an attacker.
  ADD COLUMN key_hint     TEXT;

-- Revoked agents keep their rows: their past posts stay attributable, and
-- the promotion history that set their quota tier stays auditable.
CREATE INDEX agents_active_idx ON agents (id) WHERE revoked_at IS NULL;

COMMIT;
