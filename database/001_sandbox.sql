-- One locked aggregate for the sandbox MVP. No real-money ledger.
CREATE TABLE IF NOT EXISTS cubpay_sandbox_state (
  id smallint PRIMARY KEY CHECK (id = 1),
  payload jsonb NOT NULL CHECK (payload->>'version' = '1'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO cubpay_sandbox_state(id, payload) VALUES (1, '{"version":1,"organizations":[],"orders":[],"allocations":[],"batches":[],"journals":[],"audit":[],"users":[],"sessions":[],"invites":[],"attempts":{}}'::jsonb)
ON CONFLICT(id) DO NOTHING;
