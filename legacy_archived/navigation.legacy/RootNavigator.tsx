// ========================================
// apps/mobile/src/navigation/RootNavigator.tsx
// Navegación raíz con expo-router
// ========================================

import * as Linking from 'expo-linking';
import * as Root from 'expo-router';

export default function RootNavigator() {
  return (
    <Root.Navigator>
      <Root.Screen name="auth" />
      <Root.Screen name="main" />
      <Root.Screen name="profile" />
    </Root.Navigator>
  );
}