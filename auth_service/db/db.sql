CREATE DATABASE auth_db;

-- Clients table (for API clients)
CREATE TABLE auth_db.clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  name              TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_email ON auth_db.clients (email);

-- Seed admin user
-- Password: admin123 (hashed with bcrypt, cost 10)
-- Hash generated with: bcrypt.hashSync('admin123', 10)
INSERT INTO auth_db.users (email, password_hash, name, role, created_at)
VALUES (
  'admin@gmail.com',
  '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUmmWQFm',
  'admin',
  'superadmin',
  NOW()
) ON CONFLICT (email) DO NOTHING;