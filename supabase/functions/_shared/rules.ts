// ========================================
// supabase/functions/_shared/rules.ts
// Motor de reglas dual (§8, RF-13/13a-13e, D-08 a D-14)
// ========================================

import { getRedemptionTtlMinutes, getRedemptionLockoutMinutes } from './settings';

/**
 * Obtiene la regla activa vigente para un local y momento dado
 * @param supabase Cliente Supabase
 * @param localId ID del local
 * @param now Local date (opcional, usa ahora si no proporciona)
 * @returns Regla activa o null si no hay regla vigente
 */
export const getActiveRule = async (
  supabase: any,
  localId: string,
  now: Date = new Date()
): Promise<{ rule: any; validFrom: string; validTo: string | null } | null> => {
  const localNow = now.toISOString();

  const { data, error } = await supabase
    .from('point_rules')
    .select('*')
    .eq('local_id', localId)
    .eq('active', true)
    .lte('valid_from', localNow);

  if (error || !data || data.length === 0) {
    return null;
  }

  // Filtrar reglas que aún no hayan expirado
  const rule = data.find((item: any) => !item.valid_to || new Date(item.valid_to) >= now) || data[0];

  return {
    rule,
    validFrom: rule.valid_from,
    validTo: rule.valid_to,
  };
};


/**
 * Calcula los nuevos saldos de sellos y puntos después de una visita
 * Basado en la lógica D-08 y RF-13/13a/13e
 * @param currentStellos Actual número de sellos en ciclo (0-5)
 * @param currentPoints Actual saldo de puntos
 * @param rule Regla activa de acumulación
 * @returns Objeto con nuevos saldos
 */
export const calculateAccumulation = (
  currentStellos: number,
  currentPoints: number,
  rule: any
): {
  newStellos: number;
  newPoints: number;
  stampIncrement: number; // 1 if a stamp was added, 0 otherwise
  pointsAdded: number
} => {
  // Sello: siempre +1 por visita (fijo, RF-13a), independientemente de la regla
  const stampIncrement = 1;
  const newStellos = Math.min(currentStellos + stampIncrement, 5); // Máximo 5 por ciclo
  
  // Puntos: cantidad fija configurable de la regla 'por_visita' (RF-13e)
  // Si la regla es 'por_importe', los puntos dependen del importe (Fase 2, fuera de MVP)
  let pointsAdded = 0;
  
  if (rule.type === 'por_visita') {
    pointsAdded = rule.points || 0; // Cantidad fija por visita
  }
  // Si type === 'por_importe', pointsAdded = 0 en MVP (regla no operativa)
  
  const newPoints = currentPoints + pointsAdded;
  
  return {
    newStellos,
    newPoints,
    stampIncrement,
    pointsAdded
  };
};

/**
 * Verifica si el ciclo de sellos se completó (llegó a 5)
 * @param nuevoSelloCount Nuevo contador de sellos
 * @returns Boolean indicando si el ciclo está completo
 */
export const isCycleComplete = (nuevoSelloCount: number): boolean => {
  return nuevoSelloCount >= 5;
};

/**
 * Verifica si hay lockout de redención activo
 * Basado en intentos fallidos y tiempo (ARQ §8.2)
 * @param attemptCount Número de intentos fallidos consecutivos
 * @param lastAttemptTime Hora del último intento
 * @param lockoutDurationDuración del lockout en minutos
 * @returns Boolean indicando si está en lockout
 */
export const checkRedemptionLockout = (
  attemptCount: number,
  lastAttemptTime: Date,
  lockoutDurationMinutes: number = 5
): { inLockout: boolean; timeUntilRelease?: number } => {
  if (attemptCount < 30) { // Límite: 30 intentos fallidos
    return { inLockout: false };
  }
  
  // Calcular tiempo transcurrido desde el último intento
  const now = new Date();
  const elapsedMinutes = (now.getTime() - lastAttemptTime.getTime()) / 60000;
  
  if (elapsedMinutes < lockoutDurationMinutes) {
    const timeUntilRelease = lockoutDurationMinutes - elapsedMinutes;
    return { 
      inLockout: true, 
      timeUntilRelease: Math.max(0, timeUntilRelease) 
    };
  }
  
  // Lockout expirado, resetear contador
  return { inLockout: false, timeUntilRelease: 0 };
};

/**
 * Determina el nivel de recompensa según el total de visitas acumuladas
 * Basado en RF-13b y RN-03: 5 visitas → 10%, 10 visitas → 20%, 50 visitas → 100%
 * @param totalVisits Total de visitas acumuladas
 * @returns Objeto con nivel y descuento
 */
export const getRewardLevel = (totalVisits: number): { level: string; discount: string; minVisits: number } => {
  if (totalVisits >= 50) {
    return { level: 'oro', discount: '100%', minVisits: 50 };
  }
  if (totalVisits >= 10) {
    return { level: 'plata', discount: '20%', minVisits: 10 };
  }
  if (totalVisits >= 5) {
    return { level: 'bronce', discount: '10%', minVisits: 5 };
  }
  return { level: 'bronce', discount: '10%', minVisits: 0 };
};

/**
 * Verifica si el cliente ya tiene una recompensa pendiente por ciclo de sellos
 * Basado en invariante de no-acumulación (RN-10, CU-10 FA-01)
 * @param pendingRewards Array de recompensas pendientes del cliente
 * @returns Boolean indicando si ya tiene recompensa pendiente
 */
export const hasPendingReward = (pendingRewards: any[]): boolean => {
  // Un cliente no puede tener más de una recompensa pendiente de redención
  // La recompensa se mantiene hasta que se redima en caja (D-09)
  return pendingRewards && pendingRewards.length > 0;
};

/**
 * Calcula el nuevo ciclo de sellos después de la redención
 * Basado en D-09: al redimir, el ciclo se reinicia a 0 pero el total_visits se preserva
 * @param currentStellos Sello count actual
 * @param totalVisits Total de visitas acumuladas
 * @returns Nuevo estado del ciclo
 */
export const calculateCycleAfterRedemption = (
  currentStellos: number,
  totalVisits: number
): { newStellos: number; preservedTotalVisits: number } => {
  // El ciclo se reinicia a 0
  // El total de visitas se preserva (determina el próximo nivel)
  return {
    newStellos: 0,
    preservedTotalVisits: totalVisits
  };
};

export const r = {
  getActiveRule,
  calculateAccumulation,
  isCycleComplete,
  checkRedemptionLockout,
  getRewardLevel,
  hasPendingReward,
  calculateCycleAfterRedemption,
};