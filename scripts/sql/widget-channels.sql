-- Additive migration. Run against the target database before deploying the new handlers.
BEGIN;
CREATE TABLE IF NOT EXISTS website_widgets (
  id text PRIMARY KEY,
  workspace_id text NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  title text NOT NULL,
  greeting text NOT NULL,
  color text NOT NULL,
  position text NOT NULL DEFAULT 'right',
  allowed_origins jsonb NOT NULL,
  last_seen_at timestamptz,
  last_seen_origin text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS widget_sessions (
  token_hash text PRIMARY KEY,
  widget_id text NOT NULL REFERENCES website_widgets(id) ON DELETE CASCADE,
  origin text NOT NULL,
  conversation_id text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS channel_events (
  id text PRIMARY KEY,
  sequence bigserial NOT NULL,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel text NOT NULL,
  conversation_id text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stage text NOT NULL DEFAULT 'received',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS channel_events_due_idx ON channel_events(status, available_at);
CREATE INDEX IF NOT EXISTS channel_events_workspace_idx ON channel_events(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS channel_events_conversation_sequence_idx ON channel_events(conversation_id, sequence);
CREATE UNIQUE INDEX IF NOT EXISTS channel_events_processing_conversation_idx ON channel_events(conversation_id) WHERE status = 'processing';
CREATE TABLE IF NOT EXISTS integration_rate_limits (
  id text PRIMARY KEY,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL
);
COMMIT;
