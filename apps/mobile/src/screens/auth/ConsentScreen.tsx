// ========================================
// apps/mobile/src/screens/auth/ConsentScreen.tsx
// Pantalla de consentimiento RGPD (RF-04, RNF-05)
// ========================================

import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useConnectivity } from '../../context/ConnectivityContext';

const ConsentScreen: React.FC = () => {
  const router = useRouter();
  const { setConsent } = useAuth();
  const { isInternetAvailable } = useConnectivity();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!isInternetAvailable) {
      Alert.alert('Sin conexión', 'Se requiere conexión a internet para registrar el consentimiento.');
      return;
    }

    setLoading(true);
    try {
      await setConsent();
      Alert.alert(
        'Consentimiento Registrado',
        'Gracias por aceptar nuestra política de privacidad.',
        [{ text: 'Continuar', onPress: () => router.replace('/(tabs)/menu') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo registrar el consentimiento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Política de Privacidad y Consentimiento RGPD</Text>
      
      <View style={styles.contentBox}>
        <Text style={styles.text}>
          En HarryWOK valoramos tu privacidad. Para ofrecerte nuestro programa de fidelización (sellos y puntos) y tu menú digital actualizado, almacenamos de forma segura tus datos de visitas, saldo e historial de consumo.
        </Text>
        <Text style={styles.text}>
          Al aceptar, das tu consentimiento explícito conforme al RGPD para el tratamiento de tus datos con fines exclusivos del servicio de fidelización del restaurante.
        </Text>
        <Text style={styles.subtext}>
          Puedes consultar, rectificar o solicitar la supresión de tu cuenta en cualquier momento desde tu perfil.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#D32F2F" />
      ) : (
        <Button
          title="Acepto y Continuar"
          onPress={handleAccept}
          color="#D32F2F"
          disabled={!isInternetAvailable}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#212121',
  },
  contentBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 24,
  },
  text: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 12,
    lineHeight: 22,
  },
  subtext: {
    fontSize: 12,
    color: '#757575',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

export default ConsentScreen;