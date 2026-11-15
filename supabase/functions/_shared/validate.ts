// ========================================
// supabase/functions/_shared/validate.ts
// Validadores de entrada para Edge Functions
// ========================================

export const validateManualCode = (code?: string): { valid: boolean; code?: string; error?: string } => {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Código manual ausente' };
  }
  const clean = code.trim().toUpperCase();
  // Admite códigos HW-XXXXXX o 6 caracteres alfanuméricos
  const regex = /^(HW-)?[A-Z0-9]{6}$/;
  if (!regex.test(clean)) {
    return { valid: false, error: 'Código debe ser de 6 caracteres alfanuméricos (ej. HW-123456)' };
  }
  return { valid: true, code: clean };
};

export const validateQrFormat = (payloadStr?: string): { valid: boolean; uid?: string; error?: string } => {
  if (!payloadStr) {
    return { valid: false, error: 'Payload de QR ausente' };
  }
  try {
    const payload = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr;
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Formato QR inválido' };
    }
    const uid = payload.uid || payload.customer_code;
    if (!uid) {
      return { valid: false, error: 'QR no contiene identificador de cliente válido' };
    }
    // Verificar TTL si existe
    if (payload.exp && typeof payload.exp === 'number') {
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec > payload.exp) {
        return { valid: false, error: 'Código QR expirado. Solicite un nuevo código al cliente.' };
      }
    }
    return { valid: true, uid };
  } catch (_e) {
    // Si no es JSON, verificar si es un código de cliente plano (HW-XXXXXX)
    const fallback = validateManualCode(payloadStr);
    if (fallback.valid) {
      return { valid: true, uid: fallback.code };
    }
    return { valid: false, error: 'No se pudo decodificar el payload del QR' };
  }
};

export const v = {
  validateManualCode,
  validateQrFormat,
};
