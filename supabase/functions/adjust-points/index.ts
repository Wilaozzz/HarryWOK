// ========================================
// supabase/functions/adjust-points/index.ts
// Ajuste administrativo de saldo
// Fuente: ARQ §8.3 [M-5]
// ========================================

import { H } from '../_shared/responses';
import { v } from '../_shared/validate';
import { a } from '../_shared/audit';
import { h } from '../_shared/hmac';
import { s } from '../_shared/settings';

interface AdjustPointsRequest {
  user_id: string;
  delta: number;
  reason: string;
  rol_usuario: 'admin' | 'cajero';
}

interface AdjustPointsResponse {
  ok: boolean;
  new_balance: number;
  movement_id: string;
  error?: string;
}

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
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'No autorizado - token inválido' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Verificar rol - admin tiene permiso sin límite, cajero tiene límite de abs(delta) <= 10
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
    
  if (!profile) {
    return new Response(
      JSON.stringify({ success: false, error: 'Perfil no encontrado' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Verificar permiso específico para cajero
  const isAdmin = profile.role === 'admin';
  const isCajero = profile.role === 'cajero';
  
  // Llamar función original pasando el rol verificado
  const requestBody = await req.json();
  const hasCajeroLimit = isCajero && Math.abs(requestBody.delta) > 10;
  
  if (hasCajeroLimit) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Cajero no puede ajustar más de ±10 puntos por operación' 
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Para cajero, verificar que reason esté presente
  if (!isAdmin && !requestBody.reason) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Razón requerida para ajuste por cajero' 
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  return fn(req, { user, profile, isAdmin, isCajero });
};

export const handler = async (req, ctx) => {
  return await withAuth(async (req, { user, profile, isAdmin, isCajero }) => {
    try {
      const body = await req.json() as AdjustPointsRequest;
      
      // 1. Validaciones básicas
      if (body.delta === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'El delta no puede ser 0' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 2. Límite para cajero: abs(delta) <= 10
      if (ctx.isCajero && Math.abs(body.delta) > 10) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Cajero no puede ajustar más de ±10 puntos por operación' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 3. Reason obligatorio para cajero
      if (ctx.isCajero && !body.reason) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Se requiere una razón para el ajuste' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 4. Verificar que el usuario existe
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('points_balance')
        .eq('user_id', body.user_id)
        .single();
      
      if (userError || !userProfile) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Usuario no encontrado' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 5. Calcular nuevo saldo
      const currentBalance = userProfile.points_balance || 0;
      const newBalance = currentBalance + body.delta;
      
      // 6. INSERT point_movements kind='ajuste_admin'
      const { error: movementError } = await supabase
        .from('point_movements')
        .insert({
          user_id: body.user_id,
          kind: 'ajuste_admin',
          delta: body.delta,
          balance_after: newBalance,
          reason: body.reason,
        });
      
      if (movementError) throw movementError;
      
      // 7. Auditar el ajuste [P-7]
      const actorRef = h.generateActorRef(user.id);
      const entityRef = h.generateEntityRef(body.user_id);
      
      await supabase.from('audit_log').insert({
        actor_ref: actorRef,
        actor_ref_version: 1,
        event: 'points.adjust',
        entity: 'point_movement',
        entity_id: entityRef,
        details: JSON.stringify({
          adjusted_by: user.id,
          reason: body.reason,
          delta: body.delta,
          new_balance: newBalance,
        }),
        occurred_at: new Date().toISOString(),
      });
      
      return new Response(
        JSON.stringify({
          ok: true,
          new_balance: newBalance,
          movement_id: '', // Se insertó, ID real en producción
          error: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      
    } catch (error: any) {
      console.error('adjust-points error:', error);
      
      let status = 500;
      let message = 'Error interno del servidor.';
      
      if (error.message?.includes('MISSING_REASON')) {
        status = 400;
        message = 'Se requiere una razón para este ajuste';
      }
      
      return new Response(
        JSON.stringify({ ok: false, error: message }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }, req);
};