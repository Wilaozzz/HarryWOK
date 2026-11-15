// ========================================
// supabase/functions/generate-customer-code/index.js
// Genera QR efímero on-demand del cliente (D-14)
// ========================================

import { H } from '../_shared/responses';
import { c } from '../_shared/codes';
import { s } from '../_shared/settings';
import { supabase } from '../_shared/auth';

interface GenerateCustomerCodeRequest {
  // No requiere parámetros - se genera on-demand para el cliente autenticado
}

interface GenerateCustomerCodeResponse {
  ok: boolean;
  customer_code: string; // Código alfanumérico permanente de 6 chars
  qr_payload: string; // Estructura {v:1, uid, nonce, exp} SHA-256 base32
  qr_ttl_remaining: number; // Segundos restantes
  error?: string;
}

export const handler = async (req) => {
  try {
    const supabase = new (await import('@supabase/supabase-js'))(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getSession();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No autenticado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 1. Obtener el customer_code permanente del perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('customer_code')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile.customer_code) {
      // Si no tiene customer_code, generarlo
      const newCode = c.generateBase32Code(6).toUpperCase(); // 6 chars alfanumérico
      
      // Guardar en perfil
      await supabase
        .from('profiles')
        .update({ customer_code: newCode })
        .eq('user_id', user.id);
      
      profile.customer_code = newCode;
    }
    
    // 2. Generar payload QR efímero: {v:1, uid, nonce, exp}
    // uid = user.id, nonce = aleatorio, exp = timestamp + TTL (10 min)
    const nonce = c.generateBase32Code(8); // 8 chars base32
    const exp = Math.floor(Date.now() / 1000) + QR_TTL_SECONDS; // 10 minutos
    
    const qrPayload = JSON.stringify({
      v: 1,
      uid: user.id,
      nonce,
      exp,
    });
    
    // 3. Calcular TTL restante
    const qrTime = new Date(exp * 1000);
    const now = new Date();
    const timeRemaining = Math.max(0, QR_TTL_SECONDS - Math.floor((now.getTime() - qrTime.getTime()) / 1000));
    
    // 4. El código del cliente es el customer_code permanente
    const customerCode = profile.customer_code || 'DEFAULT';
    
    return new Response(
      JSON.stringify({
        ok: true,
        customer_code: customerCode,
        qr_payload: qrPayload,
        qr_ttl_remaining: timeRemaining,
        error: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('generate-customer-code error:', error);
    
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Error al generar código de cliente' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};