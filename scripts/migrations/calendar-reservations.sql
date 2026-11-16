-- Apply explicitly after review; no application startup migration.
BEGIN;
CREATE TABLE IF NOT EXISTS calendar_resources (
  workspace_id text NOT NULL,
  resource_id text NOT NULL,
  PRIMARY KEY (workspace_id, resource_id)
);
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
CREATE INDEX IF NOT EXISTS calendar_reservations_overlap
  ON calendar_reservations (workspace_id, resource_id, starts_at, ends_at)
  WHERE status <> 'rejected';

-- Every application writer must enter through this function. The resource row
-- serializes admission across server instances, including unequal overlapping slots.
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
COMMIT;
