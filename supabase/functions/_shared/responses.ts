// ========================================
// supabase/functions/_shared/responses.ts
// Envelope y errores uniformes (§7.1)
// ========================================

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export const ERROR_MESSAGES: Record<string, string> = {
  'INVALID_QR_FORMAT': 'Formato de QR inválido. Escanee nuevamente o introduzca el código manual.',
  'INVALID_CODE_FORMAT': 'Formato de código inválido. Debe ser alfanumérico de 6 caracteres.',
  'INVALID_AMOUNT': 'Monto inválido. Verifique los datos e intente nuevamente.',
  'CUSTOMER_NOT_FOUND': 'Cliente no encontrado. Verifique el código e intente nuevamente.',
  'VISIT_DUPLICATE': 'El cliente ya tiene una visita registrada hoy. No se permiten visitas duplicadas.',
  'FORBIDDEN': 'No tiene permisos para realizar esta acción.',
  'RATE_LIMITED': 'Demasiados intentos. Espere un momento antes de volver a intentar.',
  'NO_ACTIVE_RULE': 'No hay reglas de fidelización activas para este momento.',
  'USER_NOT_FOUND': 'Usuario no encontrado en el sistema.',
  'CAMPAIGN_NOT_FOUND': 'Campaña no encontrada.',
  'USER_ALREADY_HAS_COUPON': 'El usuario ya tiene un cupón activo de esta campaña.',
  'UNAUTHORIZED': 'No autenticado. Inicie sesión e intente nuevamente.',
  'COUPLE_GENERATION_FAILED': 'Error interno al generar el código de redención. Intente nuevamente.',
  'INVALID_CODE': 'Código inválido o expirado.',
  'CODE_EXPIRED': 'El código ha expirado. Genere uno nuevo desde la billetera.',
  'ALREADY_REDEEMED': 'Este código ya ha sido canjeado anteriormente.',
  'WRONG_LOCAL': 'Este código no es válido para el local actual.',
  'COUPON_NOT_FOUND': 'Cupón no encontrado.',
  'TRANSACTION_CONFLICT': 'Conflicto en la transacción. Intente nuevamente.',
  'INVALID_DELTA': 'Ajuste de saldo inválido.',
  'MISSING_REASON': 'Se requiere una razón para este ajuste.',
  'CONFIRM_REQUIRED': 'Se requiere confirmación para esta acción.',
  'NOT_ACCEPTED': 'La acción no fue aceptada.',
  'ALREADY_CONSENTED': 'El consentimiento RGPD ya fue registrado previamente.',
};

export const createErrorResponse = (code: string, context?: any): ErrorResponse => {
  return {
    success: false,
    error: {
      code,
      message: ERROR_MESSAGES[code] || 'Error desconocido en la operación',
      ...(context ? { details: context } : {})
    },
    timestamp: new Date().toISOString()
  };
};

export const createSuccessResponse = <T>(data: T): SuccessResponse<T> => ({
  success: true,
  data,
  timestamp: new Date().toISOString()
});

export const jsonResponse = (body: any, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
};

export const H = {
  success: createSuccessResponse,
  error: createErrorResponse,
  json: jsonResponse,
};