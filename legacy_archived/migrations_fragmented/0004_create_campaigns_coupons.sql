-- ========================================
-- supabase/migrations/0005_create_campaigns_coupons.sql
-- Tabla de reglas de acumulación (motor dual, RF-13/13e, D-13)
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla point_rules
CREATE TABLE IF NOT EXISTS point_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('por_visita', 'por_importe')), -- MVP solo por_visita operativo (D-13); por_importe existe en esquema pero fuera del MVP
  name TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points > 0), -- Cantidad fija de puntos por visita (valor exacto: INFORMACIÓN DE NEGOCIO PENDIENTE, §16)
  amount_per_point NUMERIC(10,2), -- Solo si type='por_importe' (Fase 2)
  threshold_points INTEGER, -- Umbral de emisión automática de cupón por puntos (ARQ §9 [M-8])
  daily_cap INTEGER, -- Tope diario; aplica solo a kind='acumulo' [M-2]
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para reglas activas vigentes
CREATE INDEX IF NOT EXISTS point_rules_local_active_idx ON point_rules(local_id, active, valid_from, valid_to);

-- Comentido: En el MVP, la única regla operativa es 'por_visita'. La cantidad exacta de puntos por visita es información de negocio pendiente (§16). Los cambios se hacen por filas, no por redeploy (RF-13).

-- Adicional: Tabla campaigns para campañas de cupones
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  threshold_points INTEGER NOT NULL CHECK (threshold_points > 0),
  coupon_code TEXT UNIQUE, -- Código fijo opcional; si no, autogenerado
  code_hash TEXT, -- SHA-256 para lookup
  expires_at TIMESTAMPTZ,
  redeemed_count INTEGER DEFAULT 0,
  max_redemptions INTEGER, -- NULL = ilimitado
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para campañas activas por local
CREATE INDEX IF NOT EXISTS campaigns_local_active_idx ON campaigns(local_id, active);

-- Tabla coupons para cupones emitidos
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired')),

  -- LIMITACIÓN normativa detectada (DISC-06): la tabla coupons no tiene columnas para código de redención propio (code/code_hash),
  -- TTL por código (expires_at), ni origen (sello vs punto, exigido por D-12 y por redeem.reward_type).
  -- El flujo §10.2 de la ARQ hace SELECT coupons WHERE code_hash = hash(code), columna inexistente.
  -- La persistencia del código de redención de un solo uso con TTL (RF-18/RF-19) requiere una decisión de modelo.

  UNIQUE (campaign_id, user_id, redeemed_at) -- Nota: PostgreSQL trata los NULL como distintos; la unicidad "un cupón por campaña por usuario" no se cumple tal como está escrita cuando redeemed_at es NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS coupons_campaign_idx ON coupons(campaign_id);
CREATE INDEX IF NOT EXISTS coupons_user_status_idx ON coupons(user_id, status);

-- Comentido: La gestión de códigos de redención y TTL requiere decisiones de modelo adicionales (ver DISC-06/PT-02 en §16).