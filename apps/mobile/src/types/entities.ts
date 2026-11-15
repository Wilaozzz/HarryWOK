// ========================================
// apps/mobile/src/types/entities.ts
// Tipos de entidades sincronizados con /shared/types/entities.ts
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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface PointRule {
  id: string;
  local_id: string;
  type: RuleType;
  name: string;
  points: number;
  daily_cap: number;
  ratio_amount_currency?: number | null;
  ratio_points?: number | null;
  valid_from: string;
  valid_to: string | null;
  active: boolean;
  created_at: string;
}

export interface Visit {
  id: string;
  local_id: string;
  user_id: string;
  cashier_id: string | null;
  amount: number | null;
  points_earned: number;
  created_at: string;
}

export interface Campaign {
  id: string;
  local_id: string;
  name: string;
  description: string | null;
  threshold_points: number;
  reward_type: RewardType;
  reward_detail?: string | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

export interface Coupon {
  id: string;
  user_id: string;
  campaign_id: string;
  status: CouponStatus;
  issued_at: string;
  redeemed_at: string | null;
  expires_at: string;
}

export interface Redemption {
  id: string;
  local_id: string;
  coupon_id: string;
  cashier_id: string;
  user_id: string;
  redeemed_at: string;
}

export interface PointMovement {
  id: string;
  user_id: string;
  kind: MovementKind;
  mechanism: MovementMechanism;
  amount: number;
  balance_after: number;
  source_id: string | null;
  notes: string | null;
  created_at: string;
}
