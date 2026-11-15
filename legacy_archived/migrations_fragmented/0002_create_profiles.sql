-- ========================================
-- supabase/migrations/0002_create_profiles.sql
-- Tabla de cuentas (cliente/cajero/admin)
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla profiles (1:1 con auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id UUID REFERENCES locals(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cajero', 'cliente')),
  full_name TEXT,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  customer_code TEXT UNIQUE, -- Código alfanumérico permanente de 6 chars (§8.2 ARQ) — plan B tecleable (RF-10/RF-11)
  privacy_consent_at TIMESTAMPTZ, -- One-shot: solo escribible por set-consent o política RLS restringida; nunca modificable tras su primera asignación
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS profiles_phone_idx ON profiles(phone);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_local_id_idx ON profiles(local_id);

-- CHECK de coherencia rol/local: admin y cajero requieren local_id NOT NULL; cliente requiere local_id IS NULL
-- Esta restricción se hace a nivel de aplicación/backend, ya que CHECK con referencias a otras tablas es complejo en PostgreSQL.

-- Comentido: El campo customer_code es el plan B tecleable para que el cajero pueda identificar al cliente sin escanear QR (RF-10/RF-11, D-01).