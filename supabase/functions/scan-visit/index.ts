// ========================================
// supabase/functions/scan-visit/index.ts
// Registro de visita y acumulación dual (sellos + puntos)
// Fuente: ARQ §8.3, §9, §10.1; CUHU CU-07/HU-09; RF-10/RF-11/RF-13/RF-13a/RF-13e/RF-15; D-01, D-08, D-13, D-14
// ========================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { H } from '../_shared/responses.ts';
import { v } from '../_shared/validate.ts';
import { a } from '../_shared/audit.ts';
import { r } from '../_shared/rules.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface ScanVisitRequest {
  qr_payload?: string;
  code_manual?: string;
  customer_code?: string;
  local_id?: string;
  amount?: number;
}

export const handler = async (req: Request): Promise<Response> => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return H.json(H.error('UNAUTHORIZED', 'Token de autorización ausente'), 401);
    }

    const token = authHeader.substring(7);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Verificar usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return H.json(H.error('UNAUTHORIZED', 'Token inválido o expirado'), 401);
    }

    // 2. Verificar rol (cajero o admin)
    const { data: cashierProfile, error: cashierError } = await supabase
      .from('profiles')
      .select('id, role, local_id')
      .eq('id', user.id)
      .maybeSingle();

    if (cashierError || !cashierProfile || !['cajero', 'admin'].includes(cashierProfile.role)) {
      return H.json(H.error('FORBIDDEN', 'Solo personal de caja o administradores pueden registrar visitas'), 403);
    }

    // 3. Parsear body
    const body: ScanVisitRequest = await req.json();

    // 4. Validar identificación del cliente
    let clientIdentifier: string | null = null;
    const rawIdentifier = body.code_manual || body.customer_code;
    if (rawIdentifier) {
      const valManual = v.validateManualCode(rawIdentifier);
      if (!valManual.valid) {
        return H.json(H.error('INVALID_CODE_FORMAT', valManual.error), 400);
      }
      clientIdentifier = valManual.code || null;
    } else if (body.qr_payload) {
      const valQr = v.validateQrFormat(body.qr_payload);
      if (!valQr.valid) {
        return H.json(H.error('INVALID_QR_FORMAT', valQr.error), 400);
      }
      clientIdentifier = valQr.uid || null;
    } else {
      return H.json(H.error('INVALID_CODE_FORMAT', 'Debe proporcionar qr_payload, code_manual o customer_code'), 400);
    }

    // 5. Resolver local_id
    const localId = body.local_id || cashierProfile?.local_id || '11111111-1111-1111-1111-111111111111';

    // 6. Buscar perfil del cliente (por customer_code o id)
    let customerQuery = supabase
      .from('profiles')
      .select('id, customer_code, full_name, email')
      .eq('customer_code', clientIdentifier);

    let { data: customerProfile } = await customerQuery.maybeSingle();

    if (!customerProfile) {
      // Intento por UUID directo
      const { data: byId } = await supabase
        .from('profiles')
        .select('id, customer_code, full_name, email')
        .eq('id', clientIdentifier)
        .maybeSingle();
      customerProfile = byId;
    }

    if (!customerProfile) {
      return H.json(H.error('CUSTOMER_NOT_FOUND', 'Cliente no encontrado en el sistema'), 404);
    }

    // 7. Calcular visited_day con timezone del local
    const { data: localData } = await supabase
      .from('locals')
      .select('timezone')
      .eq('id', localId)
      .maybeSingle();

    const localTimezone = localData?.timezone || 'UTC';
    const visitedDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: localTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    // 8. Verificar regla activa de fidelización
    const activeRuleResult = await r.getActiveRule(supabase, localId);
    const activeRule = activeRuleResult?.rule || {
      id: null,
      type: 'por_visita',
      points: 10,
    };

    // 9. Registrar visita en tabla visits (con anti-duplicado)
    const { data: visitData, error: visitError } = await supabase
      .from('visits')
      .insert({
        user_id: customerProfile.id,
        local_id: localId,
        cashier_id: cashierProfile.id,
        amount: body.amount || null,
        visited_day: visitedDay,
      })
      .select()
      .maybeSingle();

    if (visitError) {
      if (visitError.code === '23505' || visitError.message?.includes('unique constraint')) {
        return H.json(H.error('VISIT_DUPLICATE', 'El cliente ya tiene una visita registrada hoy.'), 409);
      }
      throw visitError;
    }

    // 10. Calcular total de visitas acumuladas del cliente
    const { count: totalVisitsCount } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', customerProfile.id);

    const totalVisits = totalVisitsCount || 1;
    const currentStampsInCycle = ((totalVisits - 1) % 5) + 1;

    // 11. Insertar movimiento de sello (+1)
    await supabase.from('point_movements').insert({
      user_id: customerProfile.id,
      kind: 'acumulo',
      delta: 1,
      balance_after: currentStampsInCycle,
      reason: 'sello_visita',
      visit_id: visitData.id,
      rule_id: activeRule.id,
    });

    // 12. Insertar movimiento de puntos acumulables (+points)
    const pointsToAdd = activeRule.points || 10;
    await supabase.from('point_movements').insert({
      user_id: customerProfile.id,
      kind: 'acumulo',
      delta: pointsToAdd,
      balance_after: pointsToAdd,
      reason: 'visita_puntos',
      visit_id: visitData.id,
      rule_id: activeRule.id,
    });

    // 13. Obtener nivel y recompensa
    const levelInfo = r.getRewardLevel(totalVisits);
    const cycleComplete = currentStampsInCycle === 5;

    // 14. Registrar auditoría inmutable
    await a.log({
      supabase,
      actorId: cashierProfile.id,
      event: 'visit.create',
      entity: 'visit',
      entityId: visitData.id,
      details: {
        customer_id: customerProfile.id,
        stamps: currentStampsInCycle,
        points_added: pointsToAdd,
        total_visits: totalVisits,
      },
    });

    return H.json({
      ok: true,
      visit_id: visitData.id,
      customer_name: customerProfile.full_name || 'Cliente HarryWOK',
      new_balance_puntos: pointsToAdd,
      new_balance_sellos: currentStampsInCycle,
      points_earned: pointsToAdd,
      sello_count: currentStampsInCycle,
      total_visits: totalVisits,
      level: levelInfo.level,
      discount: levelInfo.discount,
      stamps_to_reward: cycleComplete ? 5 : null,
      cycle_complete: cycleComplete,
    });
  } catch (error: any) {
    console.error('scan-visit error:', error);
    return H.json(H.error('ERROR_SERVER', error.message || 'Error interno al registrar visita'), 500);
  }
};

// Deno.serve para compatibilidad directa con Supabase Edge Functions
if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve(handler);
}