// ========================================
// supabase/functions/set-consent/index.js
// Consentimiento RGPD one-shot [B-6]
// ========================================

import { H } from '../_shared/responses';
import { supabase } from '../_shared/auth';

interface SetConsentRequest {
  accepted: boolean;
}

interface SetConsentResponse {
  ok: boolean;
  consented_at: string;
  error?: string;
}

export const handler = async (req) => {
  try {
    const body = await req.json() as SetConsentRequest;
    
    const supabase = new (await import('@supabase/supabase-js'))(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Obtener usuario actual del token (usaría el JWT del cliente en producción)
    // Para este ejemplo, usaremos un user_id fijo o extraído del contexto
    const { data: { user } } = await supabase.auth.getSession();
    
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No autenticado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 1. Verificar que no haya consentimiento previo (one-shot)
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('privacy_consent_at')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) throw profileError;
    
    // Lógica one-shot: solo se establece cuando privacy_consent_at IS NULL
    // Si ya tiene valor, no se puede cambiar (es irreversible)
    if (existingProfile.privacy_consent_at !== null) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'Consentimiento RGPD ya registrado previamente. Esta acción es irreversible.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. Si accepted=true y no hay consentimiento previo, registrarlo
    if (body.accepted) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ privacy_consent_at: new Date().toISOString() })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      // 3. Auditar el consentimiento [B-5, M-13]
      const actorRef = h.generateActorRef(user.id);
      const entityRef = h.generateEntityRef(user.id);
      
      await supabase.from('audit_log').insert({
        actor_ref: actorRef,
        actor_ref_version: 1,
        event: 'consent.set',
        entity: 'profiles',
        entity_id: entityRef,
        details: JSON.stringify({
          type: 'rgpd_consent',
          accepted: true,
          user_id: user.id,
        }),
        occurred_at: new Date().toISOString(),
      });
      
      return new Response(
        JSON.stringify({
          ok: true,
          consented_at: new Date().toISOString(),
          error: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Si accepted=false y ya tenía consentimiento, error
    // Si accepted=false y no tenía consentimiento, simplemente no hacer nada o mostrar mensaje
    return new Response(
      JSON.stringify({ 
        ok: body.accepted === false ? true : false, 
        consented_at: existingProfile.privacy_consent_at || '',
        error: body.accepted === false ? 'Consentimiento no aceptado' : null 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('set-consent error:', error);
    
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};