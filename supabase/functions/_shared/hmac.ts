// ========================================
// supabase/functions/_shared/hmac.ts
// HMAC y seudonimización mediante Web Crypto nativo
// ========================================

export const HMAC_SECRET = Deno?.env?.get('HMAC_SECRET') || 'harrywok-secret-key-salt';

export const generateHash = async (text: string, secret = HMAC_SECRET): Promise<string> => {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const generateActorRef = async (actorId: string): Promise<string> => {
  return await generateHash(actorId);
};

export const generateEntityRef = async (id: string): Promise<string> => {
  return await generateHash(id);
};

export const h = {
  generateActorRef,
  generateEntityRef,
  generateHash,
};