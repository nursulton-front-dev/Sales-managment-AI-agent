-- Explicit migration only; never run automatically against production.
BEGIN;
CREATE TABLE IF NOT EXISTS knowledge_requests (
 id text PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES workspaces(id),
 agent_id text NOT NULL REFERENCES agents(id),
 question text NOT NULL,
 dedupe_key text NOT NULL,
 answer text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (workspace_id, agent_id, dedupe_key)
);
COMMIT;
