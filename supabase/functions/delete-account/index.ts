// ========================================
// supabase/functions/delete-account/index.js
// Derecho de supresión (RF-04, RNF-05)
// ========================================

import { H } from '../_shared/responses';
import { a } from '../_shared/audit';
import { h } from '../_shared/hmac';

interface DeleteAccountRequest {
  confirm: boolean;
}

interface DeleteAccountResponse {
  ok: boolean;
  deleted_at: string;
  error?: string;
}

export const handler = async (req) => {
  try {
    const body = await req.json() as DeleteAccountRequest;
    
    const supabase = new (await import('@supabase/supabase-js'))(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // NOTE: En un caso real, este endpoint sería llamado AUTÉNTICAMENTE por el propio cliente
    // con su token de sesión. Aquí lo simulamos con service-role para la implementación.
    // El flujo real sería:
    // 1. Cliente llama a set-consent para aceptar RGPD
    // 2. Cliente llama a delete-account confirmando
    // 3. El backend borra los datos con las FKs en cascada
    
    if (!body.confirm) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Confirmación requerida' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 1. Auditar antes de borrar (seudonimizado)
    const actorRef = h.generateActorRef('system');
    const entityRef = h.generateEntityRef('user-' + Date.now());
    
    await supabase.from('audit_log').insert({
      actor_ref: actorRef,
      actor_ref_version: 1,
      event: 'account.delete',
      entity: 'profiles',
      entity_id: 'user-pending',
      details: JSON.stringify({
        type: 'pending_deletion',
        timestamp: new Date().toISOString(),
      }),
      occurred_at: new Date().toISOString(),
    });
    
    // 2. Borrar perfil y cascada (visitas, movimientos, cupones propios se eliminan por ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', 'current-user') // En producción: usar user real autenticado
      .select();
    
    if (deleteError) throw deleteError;
    
    // 3. Nota: La eliminación real del usuario Auth (auth.users) NO está incluida aquí
    // para mantener trazabilidad auditística. El perfil se borra pero la sesión Auth puede
    // mantenerse o ser invalidada según política.
    
    const deletedAt = new Date().toISOString();
    
    return new Response(
      JSON.stringify({
        ok: true,
        deleted_at: deletedAt,
        error: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('delete-account error:', error);
    
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};