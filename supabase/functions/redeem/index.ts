// ========================================
// supabase/functions/redeem/index.ts
// Validación y consumo de cupones/recompensas en caja
// Fuente: ARQ §8.3, §10.2; RF-18, RF-19; D-09, D-11, D-12.
// ========================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { H } from '../_shared/responses.ts';
import { a } from '../_shared/audit.ts';
import { c } from '../_shared/codes.ts';
import { s } from '../_shared/settings.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface RedeemRequest {
  code: string;
  local_id?: string;
  amount?: number;
}

export const handler = async (req: Request): Promise<Response> => {
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
      return H.json(H.error('FORBIDDEN', 'Requiere rol cajero o admin'), 403);
    }

    const body: RedeemRequest = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return H.json(H.error('INVALID_CODE', 'Código de redención ausente'), 400);
    }

    const cleanCode = code.trim().toUpperCase();
    const codeHash = await c.hashCode(cleanCode);

    // 3. Buscar cupón por coupon_code o por code_hash
    let { data: coupon } = await supabase
      .from('coupons')
      .select('*, campaigns(*)')
      .or(`coupon_code.eq.${cleanCode},code_hash.eq.${codeHash}`)
      .maybeSingle();

    if (!coupon) {
      return H.json(H.error('COUPON_NOT_FOUND', 'Código de cupón no encontrado o inválido'), 404);
    }

    // 4. Verificar si ya fue canjeado
    if (coupon.status === 'redeemed' || coupon.redeemed_at) {
      return H.json(H.error('ALREADY_REDEEMED', 'Este cupón ya fue canjeado previamente.'), 400);
    }

    // 5. Verificar TTL / Expiración
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return H.json(H.error('CODE_EXPIRED', 'El código ha expirado.'), 400);
    }

    const localId = body.local_id || cashierProfile.local_id;
    const nowIso = new Date().toISOString();

    // 6. Marcar como canjeado
    await supabase
      .from('coupons')
      .update({
        status: 'redeemed',
        redeemed_at: nowIso,
      })
      .eq('id', coupon.id);

    // 7. Registrar en tabla redemptions
    const { data: redemptionData } = await supabase
      .from('redemptions')
      .insert({
        coupon_id: coupon.id,
        user_id: coupon.user_id,
        cashier_id: cashierProfile.id,
        local_id: localId,
        amount: body.amount || 0,
        redeemed_at: nowIso,
        notes: `Canje de cupón: ${coupon.campaigns?.name || 'Recompensa'}`,
      })
      .select()
      .maybeSingle();

    // 8. Si es canje de puntos, registrar movimiento negativo en point_movements
    const pointsConsumed = coupon.campaigns?.threshold_points || 0;
    if (pointsConsumed > 0) {
      await supabase.from('point_movements').insert({
        user_id: coupon.user_id,
        kind: 'canje',
        delta: -pointsConsumed,
        balance_after: 0,
        reason: 'canje_en_caja',
        campaign_id: coupon.campaign_id,
      });
    }

    // 9. Registrar auditoría
    await a.log({
      supabase,
      actorId: cashierProfile.id,
      event: 'coupon.redeemed',
      entity: 'coupon',
      entityId: coupon.id,
      details: {
        customer_id: coupon.user_id,
        campaign_id: coupon.campaign_id,
        points_consumed: pointsConsumed,
      },
    });

    return H.json({
      ok: true,
      coupon_redeemed: {
        id: coupon.id,
        name: coupon.campaigns?.name || 'Cupón HarryWOK',
        status: 'redeemed',
        redeemed_at: nowIso,
      },
      points_consumed: pointsConsumed,
      reward_type: coupon.campaigns?.reward_type || 'punto',
      reward_value: coupon.campaigns?.name || 'Beneficio Aplicado',
    });
  } catch (error: any) {
    console.error('redeem error:', error);
    return H.json(H.error('ERROR_SERVER', error.message || 'Error al validar cupón en caja'), 500);
  }
};

if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve(handler);
}