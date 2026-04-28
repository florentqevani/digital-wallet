-- Log service database initialisation
-- Runs via psql inside docker-entrypoint-initdb.d, so \c metacommand works.

CREATE DATABASE log_db;
\c log_db

CREATE TABLE IF NOT EXISTS logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    TEXT NOT NULL,
  actor_type  TEXT NOT NULL,
  action      TEXT NOT NULL,
  status      TEXT NOT NULL,
  message     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_actor      ON logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_logs_actor_type ON logs (actor_type);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs (created_at DESC);