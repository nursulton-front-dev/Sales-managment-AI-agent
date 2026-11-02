-- Safe idempotent migration for Telegram Business Secretary Mode
-- Apply in Neon PostgreSQL Console or via psql

-- 1. Add Telegram Business columns to workspaces table
ALTER TABLE workspaces 
  ADD COLUMN IF NOT EXISTS telegram_business_connected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_business_connection_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_business_user_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_business_username TEXT,
  ADD COLUMN IF NOT EXISTS telegram_business_can_reply BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_business_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_business_agent_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_business_connected_at TIMESTAMPTZ;

-- 2. Create telegram_business_bindings table for one-time nonce authorization
CREATE TABLE IF NOT EXISTS telegram_business_bindings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  verified_telegram_user_id TEXT,
  verified_telegram_username TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create index for workspace lookups
CREATE INDEX IF NOT EXISTS idx_tg_business_bindings_workspace ON telegram_business_bindings(workspace_id);
