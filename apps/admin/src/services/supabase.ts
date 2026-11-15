// ========================================
// apps/admin/src/services/supabase.ts
// Cliente Supabase para el panel administrativo
// ========================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en apps/admin');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export default supabase;