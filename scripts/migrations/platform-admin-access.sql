-- Review and apply explicitly. Application never auto-migrates production.
BEGIN;
CREATE TABLE IF NOT EXISTS platform_admin_access (
 email TEXT PRIMARY KEY,
 user_id TEXT,
 role TEXT NOT NULL CHECK (role IN ('support', 'finance', 'operator')),
 status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'revoked')),
 token_hash TEXT UNIQUE,
 expires_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK (email = lower(trim(email))),
 CHECK (status <> 'active' OR user_id IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS platform_admin_access_events (
 id BIGSERIAL PRIMARY KEY,
 actor_email TEXT NOT NULL,
 target_email TEXT NOT NULL,
 action TEXT NOT NULL,
 role TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;
