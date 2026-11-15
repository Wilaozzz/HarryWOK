// ========================================
// shared/types/constants.ts
// Constantes compartidas entre frontend y backend
// Derivado de CODIGO_BACKEND_HarryWOK.md y CODIGO_FRONTEND_HarryWOK.md
// ========================================

export const CODE_LENGTH = 8;
export const QR_TTL_SECONDS = 600; // 10 minutos
export const STAMP_CYCLE_SIZE = 5; // 5 sellos por ciclo
export const DEFAULT_REDEMPTION_TTL_MINUTES = 10;
export const DEFAULT_LOCKOUT_ATTEMPTS = 30;
export const DEFAULT_LOCKOUT_DURATION_MINUTES = 5;

export const STORAGE_KEYS = {
  SESSION: "harrywok_session",
  USER_PROFILE: "harrywok_profile",
  CONSENT: "harrywok_consent",
  LOCAL_ID: "harrywok_local_id",
  WALLET: "harrywok_wallet",
  VISIT_HISTORY: "harrywok_visit_history",
  REDEMPTION_CODE: "harrywok_redemption_code",
  REWARDS: "harrywok_rewards",
  POINTS_HISTORY: "harrywok_points_history",
  VISIT_HISTORY: "harrywok_visit_history",
  LOYALTY_DASHBOARD: "harrywok_loyalty_dashboard",
  CATEGORY_FILTER: "harrywok_category_filter",
  SEARCHHISTORY: "harrywok_search_history",
  };

export const LEVEL_THRESHOLDS = [
  { level: "bronce", minVisits: 0, discount: "10%" },
  { level: "plata", minVisits: 5, discount: "20%" },
  { level: "oro", minVisits: 10, discount: "100%" }
];
export const STAMPS_PER_CYCLE = 5;