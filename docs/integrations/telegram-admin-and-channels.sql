-- Idempotent Migration: Performance Indices for Channels Admin & Telegram Metrics
-- File: docs/integrations/telegram-admin-and-channels.sql

-- 1. Index on channel_events (created_at, status, stage) for fast stats aggregation and stuck event lookups
CREATE INDEX IF NOT EXISTS idx_channel_events_created_status 
  ON channel_events (created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_channel_events_status_locked 
  ON channel_events (status, locked_until);

-- 2. Index on messages (created_at, sender) for traffic aggregation
CREATE INDEX IF NOT EXISTS idx_messages_created_sender 
  ON messages (created_at DESC, sender);

-- 3. Index on workspaces for telegram business connections
CREATE INDEX IF NOT EXISTS idx_workspaces_tg_business 
  ON workspaces (telegram_business_connected, telegram_business_enabled);

-- 4. Index on telegram_business_bindings for nonce lookup
CREATE INDEX IF NOT EXISTS idx_tg_business_bindings_expires 
  ON telegram_business_bindings (expires_at, user_id);
