// ========================================
// apps/mobile/app/(tabs)/index.tsx
// Redirección de la raíz de tabs a /menu
// ========================================

import { Redirect } from 'expo-router';

export default function TabsIndex() {
  return <Redirect href="/(tabs)/menu" />;
}
