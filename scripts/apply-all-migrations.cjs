const dns = require('dns');
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
process.loadEnvFile('.env.local');
const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('1. Applying platform_admin_access...');
  await sql.query(`
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
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS platform_admin_access_events (
      id BIGSERIAL PRIMARY KEY,
      actor_email TEXT NOT NULL,
      target_email TEXT NOT NULL,
      action TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✓ platform_admin_access and events created.');

  console.log('2. Applying AI Sales Engine columns & logs...');
  await sql.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes text;`);
  await sql.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget text;`);
  await sql.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS interested_service text;`);
  await sql.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_language text;`);
  await sql.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_stage text;`);
  await sql.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_agreed_step text;`);
  await sql.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS objections jsonb DEFAULT '[]'::jsonb;`);
  await sql.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_memory jsonb DEFAULT '{}'::jsonb;`);

  await sql.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS client_memory jsonb DEFAULT '{}'::jsonb;`);

  await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider text;`);
  await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS model text;`);
  await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS input_tokens integer DEFAULT 0;`);
  await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS output_tokens integer DEFAULT 0;`);
  await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS cached_input_tokens integer DEFAULT 0;`);
  await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS latency_ms integer DEFAULT 0;`);
  await sql.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS estimated_cost_usd text DEFAULT '0';`);

  await sql.query(`
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
  `);
  await sql.query(`CREATE INDEX IF NOT EXISTS ai_execution_logs_workspace_idx ON ai_execution_logs (workspace_id, created_at);`);
  console.log('✓ AI Sales Engine schema applied.');

  console.log('3. Applying calendar reservations...');
  await sql.query(`
    CREATE TABLE IF NOT EXISTS calendar_resources (
      workspace_id text NOT NULL,
      resource_id text NOT NULL,
      PRIMARY KEY (workspace_id, resource_id)
    );
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS calendar_reservations (
      id text PRIMARY KEY,
      workspace_id text NOT NULL,
      resource_id text NOT NULL,
      request_key text NOT NULL,
      starts_at timestamptz NOT NULL,
      ends_at timestamptz NOT NULL,
      status text NOT NULL DEFAULT 'reserved'
        CHECK (status IN ('reserved', 'creating', 'confirmed', 'rejected', 'review')),
      google_event_id text NOT NULL UNIQUE,
      payload jsonb NOT NULL DEFAULT '{}',
      lead_id text,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (workspace_id, resource_id, request_key),
      FOREIGN KEY (workspace_id, resource_id) REFERENCES calendar_resources,
      CHECK (starts_at < ends_at)
    );
  `);

  await sql.query(`
    CREATE INDEX IF NOT EXISTS calendar_reservations_overlap
      ON calendar_reservations (workspace_id, resource_id, starts_at, ends_at)
      WHERE status <> 'rejected';
  `);

  await sql.query(`
    CREATE OR REPLACE FUNCTION reserve_calendar_interval(
      p_id text, p_workspace text, p_resource text, p_request text,
      p_start timestamptz, p_end timestamptz, p_event text, p_payload jsonb DEFAULT '{}'
    ) RETURNS text LANGUAGE plpgsql AS $$
    DECLARE existing calendar_reservations%ROWTYPE;
    BEGIN
      IF p_start >= p_end THEN RAISE EXCEPTION 'invalid interval'; END IF;
      INSERT INTO calendar_resources VALUES (p_workspace, p_resource) ON CONFLICT DO NOTHING;
      PERFORM 1 FROM calendar_resources
        WHERE workspace_id = p_workspace AND resource_id = p_resource FOR UPDATE;
      SELECT * INTO existing FROM calendar_reservations
        WHERE workspace_id = p_workspace AND resource_id = p_resource AND request_key = p_request;
      IF FOUND THEN
        IF existing.starts_at IS DISTINCT FROM p_start OR existing.ends_at IS DISTINCT FROM p_end
          OR existing.payload IS DISTINCT FROM p_payload THEN
          RAISE EXCEPTION 'idempotency key reused with different operation parameters';
        END IF;
        RETURN existing.id;
      END IF;
      IF EXISTS (SELECT 1 FROM calendar_reservations
        WHERE workspace_id = p_workspace AND resource_id = p_resource
          AND status <> 'rejected' AND starts_at < p_end AND ends_at > p_start) THEN
        RETURN NULL;
      END IF;
      INSERT INTO calendar_reservations
        (id, workspace_id, resource_id, request_key, starts_at, ends_at, google_event_id, payload)
        VALUES (p_id, p_workspace, p_resource, p_request, p_start, p_end, p_event, p_payload);
      RETURN p_id;
    END;
    $$;
  `);
  console.log('✓ Calendar reservations applied.');

  console.log('4. Applying knowledge_requests...');
  await sql.query(`
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
  `);
  console.log('✓ knowledge_requests applied.');

  console.log('5. Applying instagram_events...');
  await sql.query(`
    CREATE TABLE IF NOT EXISTS instagram_events (
      id text PRIMARY KEY,
      workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      event_id text NOT NULL UNIQUE,
      sender_id text NOT NULL,
      recipient_id text NOT NULL,
      message_text text,
      raw_payload jsonb,
      status text NOT NULL DEFAULT 'received',
      processed_at timestamp with time zone,
      error_reason text,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
  console.log('✓ instagram_events applied.');

  console.log('\nAll migrations applied successfully!');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
