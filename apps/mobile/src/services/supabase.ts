// ========================================
// apps/mobile/src/services/supabase.ts
// Cliente Supabase para la app móvil
// ========================================

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getSupabaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://192.168.20.248:54321';

  // Si estamos en un dispositivo físico o emulador (iOS/Android)
  if (Platform.OS !== 'web') {
    // Si la URL apunta a localhost o 127.0.0.1, el teléfono no puede resolverla directamente
    if (envUrl.includes('127.0.0.1') || envUrl.includes('localhost')) {
      const hostUri = Constants.expoConfig?.hostUri;
      if (hostUri) {
        const hostIp = hostUri.split(':')[0];
        return envUrl.replace('127.0.0.1', hostIp).replace('localhost', hostIp);
      }
      return 'http://192.168.20.248:54321';
    }
  }

  return envUrl;
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
