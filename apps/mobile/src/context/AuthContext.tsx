// ========================================
// apps/mobile/src/context/AuthContext.tsx
// Contexto de autenticación global con soporte para OTP y Correo/Contraseña
// ========================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { Profile } from '@shared/types/entities';

type AuthContextType = {
  user: any;
  profile: Profile | null;
  session: any;
  login: (email: string, password?: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  checkConsent: () => Promise<boolean>;
  setConsent: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  login: async () => {},
  verifyOtp: async () => {},
  signup: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  checkConsent: async () => false,
  setConsent: async () => {},
  refreshProfile: async () => {},
  loading: true,
});

export const useAuth = (): AuthContextType => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, userEmail?: string, fullName?: string) => {
    try {
      // Intentar hasta 3 veces con una pequeña pausa para permitir que el trigger SQL finalice
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (data) {
          setProfile(data as Profile);
          return;
        }

        // Si es el primer o segundo intento, esperar 300ms antes de reintentar
        if (attempt < 2) {
          await new Promise((res) => setTimeout(res, 300));
        }
      }

      // Si tras 3 intentos no existe el perfil (caso atípico sin trigger activo), crear resguardo
      const generatedCode = 'HW-' + Math.floor(100000 + Math.random() * 900000);
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          role: 'cliente',
          email: userEmail || null,
          full_name: fullName || (userEmail ? userEmail.split('@')[0] : 'Cliente'),
          customer_code: generatedCode,
        })
        .select()
        .maybeSingle();

      if (!insertError && newProfile) {
        setProfile(newProfile as Profile);
      }
    } catch (err) {
      console.error('Error fetching/creating profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id, user.email, profile?.full_name || undefined);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser.email);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id, currentUser.email);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkConsent = async (): Promise<boolean> => {
    if (!user) return false;
    if (profile?.privacy_consent_at) return true;

    const { data, error } = await supabase
      .from('profiles')
      .select('privacy_consent_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) return false;
    return data.privacy_consent_at !== null;
  };

  const setConsent = async (): Promise<void> => {
    if (!user) return;
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ privacy_consent_at: nowIso })
      .eq('id', user.id);

    if (error) throw error;
    if (profile) {
      setProfile({ ...profile, privacy_consent_at: nowIso });
    }
  };

  const login = async (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        await fetchProfile(data.session.user.id, data.session.user.email);
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
      });
      if (error) throw error;
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: token.trim(),
      type: 'email',
    });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      await fetchProfile(data.session.user.id, data.session.user.email);
    }
  };

  const signup = async (email: string, password: string, fullName?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName || '',
          role: 'cliente',
        },
      },
    });
    if (error) throw error;

    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      await fetchProfile(data.session.user.id, data.session.user.email, fullName);
    } else if (data.user) {
      await fetchProfile(data.user.id, data.user.email, fullName);
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        login,
        verifyOtp,
        signup,
        signInWithGoogle,
        signOut,
        checkConsent,
        setConsent,
        refreshProfile,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};