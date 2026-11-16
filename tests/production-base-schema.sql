CREATE SEQUENCE IF NOT EXISTS channel_events_sequence_seq;
-- Generated production schema DDL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS accounts (
  id text NOT NULL,
  user_id text NOT NULL,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  id_token text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id text NOT NULL,
  admin_email text NOT NULL,
  admin_role text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  reason text NOT NULL,
  diff_before jsonb,
  diff_after jsonb,
  result text NOT NULL DEFAULT 'success'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS agents (
  id text NOT NULL,
  workspace_id text NOT NULL,
  name text NOT NULL,
  niche_template text NOT NULL,
  knowledge_base text NOT NULL DEFAULT ''::text,
  qualification_questions jsonb DEFAULT '[]'::jsonb,
  system_prompt text NOT NULL,
  tg_bot_token text,
  google_calendar_connected bool NOT NULL DEFAULT false,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS appointments (
  id text NOT NULL,
  workspace_id text NOT NULL,
  lead_id text,
  agent_id text,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  service_name text NOT NULL DEFAULT 'Консультация / Пробный урок'::text,
  specialist_name text DEFAULT 'Дежурный специалист'::text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'::text,
  google_event_id text,
  google_event_link text,
  reminder_sent bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS channel_events (
  id text NOT NULL,
  sequence int8 NOT NULL DEFAULT nextval('channel_events_sequence_seq'::regclass),
  workspace_id text NOT NULL,
  channel text NOT NULL,
  conversation_id text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  stage text NOT NULL DEFAULT 'received'::text,
  attempts int4 NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id text NOT NULL,
  workspace_id text NOT NULL,
  agent_id text,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  channel text NOT NULL DEFAULT 'Telegram'::text,
  status text NOT NULL DEFAULT 'active'::text,
  last_message_text text DEFAULT ''::text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS integration_rate_limits (
  id text NOT NULL,
  count int4 NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS leads (
  id text NOT NULL,
  workspace_id text NOT NULL,
  agent_id text,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'new'::text,
  appointment_time timestamptz,
  tokens_spent int4 NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  google_event_id text,
  google_event_link text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS messages (
  id text NOT NULL,
  conversation_id text NOT NULL,
  workspace_id text NOT NULL,
  sender text NOT NULL,
  text text NOT NULL,
  tokens_cost int4 NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS orders (
  id text NOT NULL,
  workspace_id text NOT NULL,
  lead_id text,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  total_amount int4 NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'UZS'::text,
  delivery_address text DEFAULT ''::text,
  status text NOT NULL DEFAULT 'new'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id text NOT NULL,
  user_id text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS support_messages (
  id text NOT NULL,
  ticket_id text NOT NULL,
  sender_role text NOT NULL,
  sender_email text NOT NULL,
  sender_name text NOT NULL,
  text text NOT NULL,
  is_internal_note bool NOT NULL DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS support_sessions (
  id text NOT NULL,
  super_admin_email text NOT NULL,
  target_workspace_id text NOT NULL,
  reason text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  is_active bool NOT NULL DEFAULT true,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id text NOT NULL,
  ticket_number int4 NOT NULL,
  workspace_id text NOT NULL,
  author_email text NOT NULL,
  author_name text NOT NULL,
  type text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'new'::text,
  assigned_to text,
  unread_by_customer bool NOT NULL DEFAULT false,
  unread_by_support bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS telegram_business_bindings (
  id text NOT NULL,
  workspace_id text NOT NULL,
  agent_id text NOT NULL,
  verified_telegram_user_id text,
  verified_telegram_username text,
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS token_logs (
  id text NOT NULL,
  workspace_id text NOT NULL,
  action_type text NOT NULL,
  tokens_delta int4 NOT NULL,
  amount_usd text NOT NULL DEFAULT '0'::text,
  payment_method text NOT NULL DEFAULT 'system'::text,
  description text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS trial_grants (
  id text NOT NULL,
  owner_email text NOT NULL,
  owner_phone text NOT NULL,
  workspace_id text NOT NULL,
  granted_tokens int4 NOT NULL DEFAULT 100,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS users (
  id text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  email_verified bool NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS verifications (
  id text NOT NULL,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS website_widgets (
  id text NOT NULL,
  workspace_id text NOT NULL,
  agent_id text NOT NULL,
  enabled bool NOT NULL DEFAULT false,
  title text NOT NULL,
  greeting text NOT NULL,
  color text NOT NULL,
  position text NOT NULL DEFAULT 'right'::text,
  allowed_origins jsonb NOT NULL,
  last_seen_at timestamptz,
  last_seen_origin text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS widget_sessions (
  token_hash text NOT NULL,
  widget_id text NOT NULL,
  origin text NOT NULL,
  conversation_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (token_hash)
);

CREATE TABLE IF NOT EXISTS workspaces (
  id text NOT NULL,
  company_name text NOT NULL,
  niche text NOT NULL,
  owner_name text NOT NULL,
  owner_email text NOT NULL,
  owner_phone text NOT NULL,
  password_hash text NOT NULL,
  team_size text NOT NULL,
  daily_leads_volume text NOT NULL,
  plan text NOT NULL DEFAULT 'trial'::text,
  token_balance int4 NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'active'::text,
  email_verified bool NOT NULL DEFAULT false,
  verification_code text,
  verification_sent_at timestamptz,
  sub_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  google_calendar_connected bool NOT NULL DEFAULT false,
  google_calendar_email text,
  google_refresh_token text,
  google_calendar_id text DEFAULT 'primary'::text,
  google_calendar_working_hours text DEFAULT '10:00-18:00'::text,
  google_calendar_slot_duration int4 DEFAULT 45,
  instagram_connected bool NOT NULL DEFAULT false,
  instagram_user_id text,
  instagram_username text,
  instagram_access_token text,
  instagram_token_expires_at timestamptz,
  instagram_scopes jsonb DEFAULT '[]'::jsonb,
  instagram_status text NOT NULL DEFAULT 'disconnected'::text,
  instagram_last_error text,
  instagram_agent_id text,
  instagram_auto_reply bool NOT NULL DEFAULT false,
  telegram_business_connected bool NOT NULL DEFAULT false,
  telegram_business_connection_id text,
  telegram_business_user_id text,
  telegram_business_username text,
  telegram_business_can_reply bool NOT NULL DEFAULT false,
  telegram_business_enabled bool NOT NULL DEFAULT false,
  telegram_business_agent_id text,
  telegram_business_connected_at timestamptz,
  settings jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY (id)
);

CREATE INDEX idx_tg_business_bindings_workspace ON public.telegram_business_bindings USING btree (workspace_id);
CREATE INDEX channel_events_due_idx ON public.channel_events USING btree (status, available_at);
CREATE INDEX channel_events_workspace_idx ON public.channel_events USING btree (workspace_id, created_at);
CREATE INDEX channel_events_conversation_sequence_idx ON public.channel_events USING btree (conversation_id, sequence);
CREATE UNIQUE INDEX channel_events_processing_conversation_idx ON public.channel_events USING btree (conversation_id) WHERE (status = 'processing'::text);
CREATE UNIQUE INDEX sessions_token_unique ON public.sessions USING btree (token);
CREATE UNIQUE INDEX trial_grants_owner_email_unique ON public.trial_grants USING btree (owner_email);
CREATE UNIQUE INDEX users_email_unique ON public.users USING btree (email);
CREATE UNIQUE INDEX website_widgets_workspace_id_key ON public.website_widgets USING btree (workspace_id);
CREATE UNIQUE INDEX workspaces_owner_email_unique ON public.workspaces USING btree (owner_email);