// ========================================
// apps/mobile/app/(auth)/_layout.tsx
// Layout para las pantallas de autenticación
// ========================================

import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="consent" />
    </Stack>
  );
}