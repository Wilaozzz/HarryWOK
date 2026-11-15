// ========================================
// apps/mobile/src/screens/profile/ProfileScreen.tsx
// Pantalla de perfil de usuario y ajustes (RF-04)
// ========================================

import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

const ProfileScreen: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo cerrar sesión.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi Perfil</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Correo electrónico:</Text>
        <Text style={styles.value}>{user?.email || 'No disponible'}</Text>

        <Text style={styles.label}>Rol:</Text>
        <Text style={styles.value}>{profile?.role?.toUpperCase() || 'CLIENTE'}</Text>

        <Text style={styles.label}>Código de Cliente:</Text>
        <Text style={styles.valueCode}>{profile?.customer_code || 'N/A'}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Cerrar Sesión" color="#D32F2F" onPress={handleLogout} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#212121',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  label: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: '#212121',
    marginBottom: 16,
    fontWeight: '500',
  },
  valueCode: {
    fontSize: 18,
    color: '#D32F2F',
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  buttonContainer: {
    width: '100%',
  },
});

export default ProfileScreen;