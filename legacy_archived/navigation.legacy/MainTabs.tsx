// ========================================
// apps/mobile/src/navigation/MainTabs.tsx
// Bottom navigation principal (máximo 3-4 destinos, BRIEF §3, RNF-02)
// ========================================

import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import HomeScreen from '../screens/menu/MenuCategoryListScreen';
import LoyaltyScreen from '../screens/loyalty/LoyaltyDashboardScreen';
import QRScreen from '../screens/loyalty/QRDisplayScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const MainTabs: React.FC = () => {
  const tabs = [
    {
      key: 'menu',
      label: 'Menú',
      icon: 'book-open',
      screen: HomeScreen,
    },
    {
      key: 'qr',
      label: 'Mi QR',
      icon: 'qr-code',
      screen: QRScreen,
    },
    {
      key: 'wallet',
      label: 'Billetera',
      icon: 'wallet',
      screen: LoyaltyScreen,
    },
    {
      key: 'profile',
      label: 'Perfil',
      icon: 'person',
      screen: ProfileScreen,
    },
  ];

  return null; // La navegación se configura en Router
};

export default MainTabs;