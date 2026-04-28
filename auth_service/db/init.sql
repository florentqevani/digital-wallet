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
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (email);

-- Seed admin user  (password: admin123)
INSERT INTO users (email, password_hash, name, role, created_at)
VALUES (
  'admin@gmail.com',
  '$2b$10$ybOcoKMDilOZd7XVCJzS0ul8ynFiM/P18khmwQTyoBLbR.HJ2itjO',
  'admin',
  'superadmin',
  NOW()
) ON CONFLICT (email) DO NOTHING;
