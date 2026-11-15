// ========================================
// shared/types/api.ts
// Contratos de request/response para Edge Functions
// Derivado de CODIGO_BACKEND_HarryWOK.md §7.3 y CODIGO_FRONTEND_HarryWOK.md
// ========================================

export interface ScanVisitRequest {
  qr_payload?: string;
  code_manual?: string;
  local_id?: string;
  amount?: number;
}

export interface ScanVisitResponse {
  ok: true;
  visit_id: string;
  new_balance_puntos: number;
  new_balance_sellos: number;
  sello_count: number;
  total_visits: number;
  level: string;
  stamps_to_reward: number | null;
}

export interface CreateRedemptionRequest {
  user_id: string;
  campaign_id: string;
  code_manual?: string;
}

export interface CreateRedemptionResponse {
  ok: true;
  coupon_code: string;
  code_hash: string;
  expires_at: string;
}

export interface RedeemRequest {
  code: string;
  cashier_id: string;
  local_id: string;
  amount?: number;
}

export interface RedeemResponse {
  ok: true;
  coupon_redeemed: Record<string, unknown>;
  points_consumed: number;
  movement_id: string;
  reward_type: RewardType;
  reward_value: string;
}

export interface AdjustPointsRequest {
  user_id: string;
  delta: number;
  reason: string;
  rol_usuario: 'admin' | 'cajero';
}

export interface AdjustPointsResponse {
  ok: true;
  new_balance: number;
  movement_id: string;
}

export interface DeleteAccountRequest {
  confirm: true;
}

export interface DeleteAccountResponse {
  ok: true;
  deleted_at: string;
}

export interface SetConsentRequest {
  accepted: true;
}

export interface SetConsentResponse {
  ok: true;
  consented_at: string;
}

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}