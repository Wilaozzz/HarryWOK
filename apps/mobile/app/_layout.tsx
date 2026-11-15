// ========================================
// apps/mobile/app/_layout.tsx
// Root layout para Expo Router con Providers
// ========================================

import React from 'react';
import { Stack } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from '../src/context/AuthContext';
import { MenuProvider } from '../src/context/MenuContext';
import { LoyaltyProvider } from '../src/context/LoyaltyContext';
import { ConnectivityProvider } from '../src/context/ConnectivityContext';

export default function RootLayout() {
  return (
    <ConnectivityProvider>
      <AuthProvider>
        <MenuProvider>
          <LoyaltyProvider>
            <PaperProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </PaperProvider>
          </LoyaltyProvider>
        </MenuProvider>
      </AuthProvider>
    </ConnectivityProvider>
  );
}