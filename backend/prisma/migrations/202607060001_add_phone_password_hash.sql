ALTER TABLE user_identities
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Rollback:
-- ALTER TABLE user_identities DROP COLUMN IF EXISTS password_hash;
