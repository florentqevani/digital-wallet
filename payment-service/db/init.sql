-- Payment service schema
-- Runs after 01-auth-schema.sql, appends the transactions table to auth_db.

\c auth_db

CREATE TABLE IF NOT EXISTS transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL for admin top-ups (money created from outside the system)
  from_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  to_client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount         NUMERIC(20,2) NOT NULL CHECK (amount > 0),
  currency       TEXT NOT NULL DEFAULT 'ALL',
  type           TEXT NOT NULL CHECK (type IN ('TRANSFER', 'TOPUP')),
  status         TEXT NOT NULL DEFAULT 'COMPLETED',
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_from_client ON transactions (from_client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_client   ON transactions (to_client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at  ON transactions (created_at DESC);

-- Credit requests: peer-to-peer money request, stays PENDING until responded
CREATE TABLE IF NOT EXISTS credit_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  payer_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount        NUMERIC(20,2) NOT NULL CHECK (amount > 0),
  currency      TEXT NOT NULL DEFAULT 'ALL',
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_req_payer     ON credit_requests (payer_id, status);
CREATE INDEX IF NOT EXISTS idx_credit_req_requester ON credit_requests (requester_id, status);
