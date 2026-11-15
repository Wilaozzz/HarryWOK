// ========================================
// supabase/functions/_shared/codes.ts
// Generación y verificación de códigos Base32 y SHA-256
// ========================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const generateBase32Code = (length = 8): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE32_ALPHABET[bytes[i] % BASE32_ALPHABET.length];
  }
  return result;
};

export const hashCode = async (code: string): Promise<string> => {
  const enc = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', enc.encode(code));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const verifyCodeHash = async (code: string, expectedHash: string): Promise<boolean> => {
  const actualHash = await hashCode(code);
  return actualHash.toLowerCase() === expectedHash.toLowerCase();
};

export const generateRedemptionCode = async (
  supabase: any,
  ttlSeconds = 600
): Promise<{ code: string; code_hash: string; expires_at: string }> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateBase32Code(8);
    const code_hash = await hashCode(code);
    const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const { data } = await supabase
      .from('coupons')
      .select('id')
      .eq('code_hash', code_hash)
      .is('redeemed_at', null)
      .maybeSingle();

    if (!data) {
      return { code, code_hash, expires_at };
    }
  }

  const fallbackCode = generateBase32Code(8);
  const fallbackHash = await hashCode(fallbackCode);
  return {
    code: fallbackCode,
    code_hash: fallbackHash,
    expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
};

export const c = {
  generateBase32Code,
  hashCode,
  verifyCodeHash,
  generateRedemptionCode,
};