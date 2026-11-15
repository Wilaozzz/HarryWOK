-- ========================================
-- supabase/migrations/0006_create_audit_settings.sql
-- Tabla de auditoría y configuración global
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_ref TEXT NOT NULL,
  actor_ref_version INTEGER NOT NULL DEFAULT 1,
  event TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log(occurred_at DESC);

-- Tabla app_settings
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id) ON DELETE CASCADE
);

-- Seed
INSERT INTO app_settings (key, value) VALUES ('redemption_ttl_minutes', '10') ON CONFLICT (key) DO NOTHING;
INSERT INTO app_settings (key, value) VALUES ('redemption_lockout_duration_minutes', '5') ON CONFLICT (key) DO NOTHING;

-- Función helper auth_role() corregida
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS 'SELECT ''anonymous''::text;';