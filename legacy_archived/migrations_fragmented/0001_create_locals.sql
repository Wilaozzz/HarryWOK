-- ========================================
-- supabase/migrations/0001_create_locals.sql
-- Tabla de establecimientos (multi-local desde el día 1, D-02, RNF-07)
-- ========================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla locals
CREATE TABLE IF NOT EXISTS locals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  phone TEXT,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsquedas por email
CREATE INDEX IF NOT EXISTS locals_email_idx ON locals(email);

-- Comentido: Cada local es un establecimiento independiente (restaurante HarryWOK).
-- En el MVP trabajamos con un solo local, pero la entidad está modelada para escalar.