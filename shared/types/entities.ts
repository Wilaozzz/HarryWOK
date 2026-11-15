// ========================================
// shared/types/entities.ts
// Contratos TypeScript derivados de CODIGO_BACKEND_HarryWOK.md y CODIGO_FRONTEND_HarryWOK.md
// ========================================

export type Role = "admin" | "cajero" | "cliente";

export type RuleType = "por_visita" | "por_importe";

export type MovementKind = "acumulo" | "canje" | "ajuste_admin";

export type MovementMechanism = "sello" | "punto";

export type CouponStatus = "active" | "redeemed" | "expired";

export type RewardType = "sello" | "punto";

export interface Local {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id?: string;
  local_id: string | null;
  role: Role;
  full_name: string | null;
  phone?: string | null;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  privacy_consent_at: string | null;
  customer_code: string | null;
  created_at?: string;
  updated_at?: string;
}


export interface Category {
  id: string;
  local_id: string;
  name: string;
  sort_order: number;
  active: boolean;
}

export interface MenuItem {
  id: string;
  local_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  deleted_at: string | null;
  allergens: string[] | null;
  dietary_tags: string[] | null;
  sort_order: number;
}

export interface PointRule {
  id: string;
  local_id: string;
  type: RuleType;
  name: string;
  points: number;
  amount_per_point: number | null;
  threshold_points: number | null;
  daily_cap: number | null;
  valid_from: string;
  valid_to: string | null;
  active: boolean;
}

export interface Visit {
  id: string;
  user_id: string;
  local_id: string;
  cashier_id: string | null;
  amount: number | null;
  visited_day: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  local_id: string;
  name: string;
  description: string | null;
  threshold_points: number;
  coupon_code: string | null;
  code_hash: string | null;
  expires_at: string | null;
  redeemed_count: number;
  max_redemptions: number | null;
  active: boolean;
}

export interface Coupon {
  id: string;
  campaign_id: string;
  user_id: string;
  issued_at: string;
  redeemed_at: string | null;
  status: CouponStatus;
}

export interface PointMovement {
  id: string;
  user_id: string;
  kind: MovementKind;
  delta: number;
  balance_after: number;
  visit_id: string | null;
  campaign_id: string | null;
  rule_id: string | null;
  reason: string | null;
  created_at: string;
}