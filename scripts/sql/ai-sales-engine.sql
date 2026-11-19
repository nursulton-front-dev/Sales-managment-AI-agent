-- =============================================================================
-- Non-destructive migration for AI Sales Engine multi-provider, client memory, and execution logging
-- Backward compatible with existing tables (PostgreSQL / Neon)
-- =============================================================================

-- Safety timeouts: prevent transaction pileup / connection starvation
SET lock_timeout = '3s';
SET statement_timeout = '15s';

BEGIN;

-- 1. Leads structured qualification & memory
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS interested_service text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_language text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_stage text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_agreed_step text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS objections jsonb DEFAULT '[]'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_memory jsonb DEFAULT '{}'::jsonb;

-- 2. Conversations structured client memory
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS client_memory jsonb DEFAULT '{}'::jsonb;

-- 3. Messages LLM metrics and unit economics
ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS input_tokens integer DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS output_tokens integer DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS cached_input_tokens integer DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS latency_ms integer DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS estimated_cost_usd text DEFAULT '0';

-- 4. Dedicated AI Execution Logs
CREATE TABLE IF NOT EXISTS ai_execution_logs (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id text,
  channel text,
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cached_input_tokens integer DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error_code text,
  tool_calls_count integer NOT NULL DEFAULT 0,
  estimated_cost_usd text NOT NULL DEFAULT '0',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_execution_logs_workspace_idx ON ai_execution_logs (workspace_id, created_at);

COMMIT;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (if rollback is needed):
-- Run the following block to revert the schema changes cleanly:
--
-- SET lock_timeout = '3s';
-- BEGIN;
--   DROP INDEX IF EXISTS ai_execution_logs_workspace_idx;
--   DROP TABLE IF EXISTS ai_execution_logs;
--   ALTER TABLE messages DROP COLUMN IF EXISTS estimated_cost_usd;
--   ALTER TABLE messages DROP COLUMN IF EXISTS latency_ms;
--   ALTER TABLE messages DROP COLUMN IF EXISTS cached_input_tokens;
--   ALTER TABLE messages DROP COLUMN IF EXISTS output_tokens;
--   ALTER TABLE messages DROP COLUMN IF EXISTS input_tokens;
--   ALTER TABLE messages DROP COLUMN IF EXISTS model;
--   ALTER TABLE messages DROP COLUMN IF EXISTS provider;
--   ALTER TABLE conversations DROP COLUMN IF EXISTS client_memory;
--   ALTER TABLE leads DROP COLUMN IF EXISTS client_memory;
--   ALTER TABLE leads DROP COLUMN IF EXISTS objections;
--   ALTER TABLE leads DROP COLUMN IF EXISTS last_agreed_step;
--   ALTER TABLE leads DROP COLUMN IF EXISTS sales_stage;
--   ALTER TABLE leads DROP COLUMN IF EXISTS preferred_language;
--   ALTER TABLE leads DROP COLUMN IF EXISTS interested_service;
--   ALTER TABLE leads DROP COLUMN IF EXISTS budget;
--   ALTER TABLE leads DROP COLUMN IF EXISTS notes;
-- COMMIT;
-- =============================================================================
