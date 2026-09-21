CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  contact JSONB NOT NULL DEFAULT '{}',
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_event_time ON events (event, occurred_at);

CREATE TABLE IF NOT EXISTS flows (
  id BIGSERIAL PRIMARY KEY,
  trigger TEXT NOT NULL,
  steps JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flows_trigger_active ON flows (trigger, active);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  flow_id BIGINT REFERENCES flows(id) ON DELETE SET NULL,
  trigger TEXT NOT NULL,
  action TEXT NOT NULL,
  contact JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  detail TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_flow ON messages (flow_id, sent_at);
