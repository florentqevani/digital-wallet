-- Auth service database initialisation
-- Runs via psql inside docker-entrypoint-initdb.d, so \c metacommand works.

CREATE DATABASE auth_db;
\c auth_db

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT,
  currency      TEXT DEFAULT 'ALL',
  balance       NUMERIC(20,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (email);

-- Accounts table: one account per client per currency.
CREATE TABLE IF NOT EXISTS accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  currency      TEXT NOT NULL CHECK (currency IN ('ALL', 'USD', 'EUR', 'GBP')),
  balance       NUMERIC(20,2) DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_accounts_client_id ON accounts (client_id);
CREATE INDEX IF NOT EXISTS idx_accounts_currency ON accounts (currency);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts (status);

-- Currency requests table: approval workflow for non-base currency accounts.
CREATE TABLE IF NOT EXISTS currency_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  requested_currency TEXT NOT NULL CHECK (requested_currency IN ('USD', 'EUR', 'GBP')),
  status             TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  reviewed_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at        TIMESTAMPTZ,
  reason             TEXT
);

CREATE INDEX IF NOT EXISTS idx_currency_req_client_id ON currency_requests (client_id);
CREATE INDEX IF NOT EXISTS idx_currency_req_status ON currency_requests (status);
CREATE INDEX IF NOT EXISTS idx_currency_req_created_at ON currency_requests (created_at DESC);

-- One-time migration for existing client records: create base-currency accounts.
INSERT INTO accounts (client_id, currency, balance, status, created_at, updated_at)
SELECT id, 'ALL', balance, 'ACTIVE', created_at, NOW()
FROM clients
ON CONFLICT (client_id, currency) DO NOTHING;

-- Seed admin user  (password: admin123)
INSERT INTO users (email, password_hash, name, role, created_at)
VALUES (
  'admin@gmail.com',
  '$2b$10$ybOcoKMDilOZd7XVCJzS0ul8ynFiM/P18khmwQTyoBLbR.HJ2itjO',
  'admin',
  'superadmin',
  NOW()
) ON CONFLICT (email) DO NOTHING;
