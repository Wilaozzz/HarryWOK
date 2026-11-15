// ========================================
// supabase/functions/create-redemption/index.js
// Emisión de cupón/recompensa con código
// Fuente: ARQ §8.3; CUHU CU-16/HU-18 (asignación manual por responsable) y CU-11/HU-14 (canje por puntos);
// RN-07, RN-13, RN-16; RF-18, RF-19, RF-23; D-10, D-11, D-12.
// ========================================

import { H } from '../_shared/responses';
import { v } from '../_shared/validate';
import { a } from '../_shared/audit';
import { h } from '../_shared/hmac';
import { c } from '../_shared/codes';
import { s } from '../_shared/settings';

interface CreateRedemptionRequest {
  user_id: string;
  campaign_id: string;
  code_manual?: string;
}

interface CreateRedemptionResponse {
  ok: boolean;
  coupon_code?: string;
  code_hash?: string;
  expires_at?: string;
  error?: string;
}

// Middleware de autenticación similar a scan-visit
const withAuth = async (fn) => async (req) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ success: false, error: 'No autorizado - token missing' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const supabase = new (await import('@supabase/supabase-js'))(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(
    req.headers.get('authorization')!.substring(7)
  );
  
  if (error || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'No autorizado - token inválido' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Verificar rol - admin o cajero para emisión de cupones
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
    
  if (!profile || !['admin', 'cajero'].includes(profile.role)) {
    return new Response(
      JSON.stringify({ success: false, error: 'No autorizado - requiere rol admin o cajero' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  return fn(req);
};

export const handler = async (req) => {
  return await withAuth(async () => {
    try {
      const body = await req.json() as CreateRedemptionRequest;
      
      // 1. Validar que usuario y campaña existen
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', body.user_id)
        .single();
      
      if (userError || !userProfile) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Usuario no encontrado' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 2. Validar que campaña existe y está activa
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', body.campaign_id)
        .eq('active', true)
        .single();
      
      if (campaignError || !campaign) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Campaña no encontrada o inactiva' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 3. Verificar que el usuario no tenga cupón activo previo de esta campaña [RNF-06, DISC-07]
      const { data: existingCoupon, error: existingError } = await supabase
        .from('coupons')
        .select('*')
        .eq('campaign_id', body.campaign_id)
        .eq('user_id', body.user_id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (existingError) throw existingError;
      if (existingCoupon) {
        return new Response(
          JSON.stringify({ ok: false, error: 'El usuario ya tiene un cupón activo de esta campaña' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 4. Validar puntos suficientes para canje por puntos [CU-11 CA-04]
      // Si es canje por puntos, verificar que el usuario tenga suficiente saldo
      // Si es asignación manual por sellos, no se requiere validación de puntos
      
      // Para este ejemplo, verificaremos puntos si el tipo de campaña así lo requiere
      let pointsCheckPassed = true;
      
      // Verificar reglas de la campaña para ver si requiere puntos
      if (campaign.threshold_points && campaign.threshold_points > 0) {
        const { data: movements, error: movementsError } = await supabase
          .from('point_movements')
          .select('delta')
          .eq('user_id', body.user_id)
          .eq('kind', 'acumulo')
          .maybeSingle();
        
        if (movementsError) throw movementsError;
        
        const currentBalance = movementsError 
          ? 0 
          : movements.delta 
            ? Math.max(0, movements.delta) // Simplified: assuming positive delta means accumulation
            : 0;
        
        if (currentBalance < campaign.threshold_points) {
          pointsCheckPassed = false;
        }
      }
      
      if (!pointsCheckPassed) {
        return new Response(
          JSON.stringify({ ok: false, error: `Saldo de puntos insuficiente. Se necesitan ${campaign.threshold_points} puntos.` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 5. Generar código de redención único con TTL [RF-19, RN-07]
      const ttlMinutes = await s.getRedemptionTtlMinutes(supabase);
      const codeResult = await c.generateRedemptionCode(supabase, ttlMinutes * 60);
      
      // 6. INSERT coupon en la tabla coupons
      const { error: couponError } = await supabase
        .from('coupons')
        .insert({
          campaign_id: body.campaign_id,
          user_id: body.user_id,
          issued_at: new Date().toISOString(),
          status: 'active',
          // NOTA: No almacenamos code/code_hash aquí por DISC-06
          // El code_hash se usa para lookup pero la columna no existe en DDL actual
          // Esto requiere una decisión de modelo (PT-02, §16)
        });
      
      if (couponError) throw couponError;
      
      // 7. Auditar la emisión [RN-13]
      const actorRef = h.generateActorRef(user.id);
      const entityRef = h.generateEntityRef(userProfile.id);
      
      await supabase.from('audit_log').insert({
        actor_ref: actorRef,
        actor_ref_version: 1,
        event: 'coupon.emit',
        entity: 'coupon',
        entity_id: entityRef,
        details: JSON.stringify({
          campaign_id: body.campaign_id,
          reward_type: 'punto', // o 'sello' según el tipo
          threshold_points: campaign.threshold_points,
        }),
        occurred_at: new Date().toISOString(),
      });
      
      return new Response(
        JSON.stringify({
          ok: true,
          coupon_code: codeResult.code,
          code_hash: codeResult.code_hash,
          expires_at: codeResult.expires_at,
          error: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      
    } catch (error: any) {
      console.error('create-redemption error:', error);
      
      let errorCode = 'ERROR_SERVER';
      let status = 500;
      let message = 'Error interno del servidor.';
      
      if (error.message?.includes('USER_ALREADY_HAS_COUPON')) {
        errorCode = 'USER_ALREADY_HAS_COUPON';
        status = 400;
        message = 'El usuario ya tiene un cupón activo de esta campaña';
      } else if (error.message?.includes('CAMPAIGN_NOT_FOUND')) {
        errorCode = 'CAMPAIGN_NOT_FOUND';
        status = 404;
        message = 'Campaña no encontrada';
      } else if (error.message?.includes('INSUFFICIENT_POINTS')) {
        errorCode = 'INSUFFICIENT_POINTS';
        status = 400;
        message = 'Saldo de puntos insuficiente';
      }
      
      return new Response(
        JSON.stringify({ ok: false, error: message }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }, req);
};