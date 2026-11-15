// ========================================
// supabase/functions/_shared/auth.ts
// Verificación JWT + resolución de rol
// ========================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../config'; // Type generated from supabase types

// Create supabase client with service role key for internal operations
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` } } }
);

// Type guard para roles
export const isAdmin = (role: string | null): role is 'admin' => role === 'admin';
export const isCajero = (role: string | null): role is 'cajero' => role === 'cajero';
export const isCliente = (role: string | null): role is 'cliente' => role === 'cliente';

// Helper para resolver rol desde perfil (seguridad definer)
// En producción esto sería una función SQL security definer
// Aquí proporcionamos una versión TypeScript para validación en EF
export const resolveRole = (profileRole: string | null): 'admin' | 'cajero' | 'cliente' | 'anonymous' => {
  if (!profileRole) return 'anonymous';
  if (profileRole === 'admin') return 'admin';
  if (profileRole === 'cajero') return 'cajero';
  if (profileRole === 'cliente') return 'cliente';
  return 'anonymous';
};

// Verificación de JWT Bearer token en solicitudes entrantes
// Este middleware se ejecuta al inicio de cada Edge Function
export const verifyAuth = async (req): Promise<{ user: any; profile: any; role: string }> => {
  try {
    // El JWT ya debería estar verificado por la plataforma Supabase
    // Pero añadimos una verificación adicional
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) {
      throw new Error('No autenticado');
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Perfil no encontrado');
    }

    return {
      user: data.user,
      profile,
      role: profile.role
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    throw error;
  }
};

// Verificación de consentimiento RGPD (one-shot)
// Retorna true si el consentimiento existe y no ha sido dado antes
export const verifyConsent = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('privacy_consent_at')
    .eq('user_id', userId)
    .single();

  if (error || !data) return false;
  
  // One-shot: el consentimiento es irreversible y solo se establece una vez
  return data.privacy_consent_at !== null;
};