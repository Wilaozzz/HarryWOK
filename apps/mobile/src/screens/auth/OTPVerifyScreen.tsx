// ========================================
// apps/mobile/src/screens/auth/OTPVerifyScreen.tsx
// Verificación real de código OTP y flujo de consentimiento
// ========================================

import React, { useState } from 'react';
import { View, Text, TextInput, Button, ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useConnectivity } from '../../context/ConnectivityContext';

const OTPVerifyScreen: React.FC = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, checkConsent, login } = useAuth();
  const { isInternetAvailable } = useConnectivity();
  const [code, setCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyCode = async () => {
    const trimmedCode = code.trim();
    if (trimmedCode.length !== 6) {
      setError('El código OTP debe tener 6 dígitos');
      return;
    }

    if (!isInternetAvailable) {
      Alert.alert('Sin conexión', 'No hay conexión a internet.');
      return;
    }

    setVerifyLoading(true);
    setError(null);
    try {
      await verifyOtp(email || '', trimmedCode);
      const hasConsent = await checkConsent();
      if (!hasConsent) {
        router.replace('/(auth)/consent');
      } else {
        router.replace('/(tabs)/menu');
      }
    } catch (err: any) {
      setError(err.message || 'Código OTP inválido o expirado');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError(null);
    try {
      await login(email);
      Alert.alert('Código Reenviado', 'Se ha enviado un nuevo código a tu correo.');
    } catch (err: any) {
      setError(err.message || 'No se pudo reenviar el código.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificar Código OTP</Text>
      <Text style={styles.subtitle}>
        Introduce el código de 6 dígitos enviado a:{'\n'}
        <Text style={styles.emailHighlight}>{email || 'tu correo'}</Text>
      </Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="000000"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.input}
          autoFocus
        />
      </View>

      <View style={styles.buttonContainer}>
        {verifyLoading ? (
          <ActivityIndicator size="small" color="#D32F2F" />
        ) : (
          <Button
            title="Verificar y Entrar"
            onPress={verifyCode}
            color="#D32F2F"
            disabled={verifyLoading || !isInternetAvailable}
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResend}
        disabled={resending}
      >
        <Text style={styles.resendText}>
          {resending ? 'Reenviando...' : '¿No recibiste el código? Reenviar'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>← Volver a introducir correo</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#212121',
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emailHighlight: {
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 240,
    marginBottom: 20,
  },
  input: {
    fontSize: 32,
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: '#D32F2F',
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    color: '#212121',
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 240,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#FDE8E8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    maxWidth: 280,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  resendButton: {
    padding: 8,
    marginTop: 8,
  },
  resendText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
    marginTop: 16,
  },
  backText: {
    color: '#757575',
    fontSize: 13,
  },
});

export default OTPVerifyScreen;