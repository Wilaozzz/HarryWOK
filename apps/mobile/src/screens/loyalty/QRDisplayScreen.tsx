// ========================================
// apps/mobile/src/screens/loyalty/QRDisplayScreen.tsx
// Generación y visualización del QR de cliente on-demand (CU-06, RF-10, D-14)
// ========================================

import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import { useConnectivity } from '../../context/ConnectivityContext';

const QRDisplayScreen: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { isInternetAvailable } = useConnectivity();
  const [customerCode, setCustomerCode] = useState<string | null>(null);
  const [ttlRemaining, setTtlRemaining] = useState<number>(600); // 10 minutos
  const [loading, setLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Sincronizar customerCode desde el perfil de usuario real
  useEffect(() => {
    if (profile?.customer_code) {
      setCustomerCode(profile.customer_code);
    } else if (user) {
      refreshProfile();
    }
  }, [profile, user]);

  // Generar código on-demand
  const generateCode = async () => {
    if (!isInternetAvailable) {
      Alert.alert('Sin conexión', 'Se requiere conexión a internet para generar un código válido.');
      return;
    }

    setLoading(true);
    setIsExpired(false);
    try {
      if (!profile?.customer_code) {
        await refreshProfile();
      }
      const code = profile?.customer_code || customerCode || ('HW-' + Math.floor(100000 + Math.random() * 900000));
      setCustomerCode(code);
      setTtlRemaining(600);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo generar el código QR.');
    } finally {
      setLoading(false);
    }
  };

  // Cuenta regresiva del TTL (10 min)
  useEffect(() => {
    if (ttlRemaining <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTtlRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [ttlRemaining]);

  const formatMinutes = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tu Código de Cliente</Text>
      <Text style={styles.subtitle}>Muestra este código al cajero al consumir en HarryWOK.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#D32F2F" style={styles.loader} />
      ) : (
        <View style={[styles.card, isExpired && styles.cardExpired]}>
          <View style={styles.qrContainer}>
            {isExpired ? (
              <View style={styles.qrExpiredBox}>
                <Text style={styles.qrExpiredIcon}>⏳</Text>
                <Text style={styles.qrExpiredText}>CÓDIGO EXPIRADO</Text>
                <Text style={styles.qrExpiredSubtext}>Pulsa 'Regenerar Código' para obtener uno nuevo</Text>
              </View>
            ) : customerCode ? (
              <View style={styles.qrWrapper}>
                <QRCode
                  value={customerCode}
                  size={190}
                  color="#1A1A1A"
                  backgroundColor="#FFFFFF"
                />
              </View>
            ) : (
              <ActivityIndicator size="large" color="#D32F2F" />
            )}
          </View>

          <Text style={styles.codeLabel}>Código alfanumérico (Plan B tecleable):</Text>
          <Text style={[styles.codeValue, isExpired && styles.codeValueExpired]}>
            {customerCode || 'CARGANDO...'}
          </Text>

          {isExpired ? (
            <Text style={styles.ttlExpiredText}>El código ha caducado por seguridad.</Text>
          ) : (
            <Text style={styles.ttlText}>
              Válido durante: {formatMinutes(ttlRemaining)}
            </Text>
          )}
        </View>
      )}

      <Button
        title={isExpired ? "Generar Nuevo Código" : "Regenerar Código"}
        onPress={generateCode}
        color="#D32F2F"
        disabled={loading || !isInternetAvailable}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#212121',
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
  },
  loader: {
    marginVertical: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardExpired: {
    borderColor: '#EF5350',
    backgroundColor: '#FFFAFA',
  },
  qrContainer: {
    width: 220,
    height: 220,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
    padding: 10,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  qrExpiredBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  qrExpiredIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  qrExpiredSubtext: {
    fontSize: 11,
    color: '#757575',
    textAlign: 'center',
    marginTop: 6,
  },
  qrExpiredText: {
    fontWeight: 'bold',
    color: '#DC2626',
    fontSize: 14,
  },
  codeLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#D32F2F',
    marginBottom: 10,
  },
  codeValueExpired: {
    color: '#9E9E9E',
    textDecorationLine: 'line-through',
  },
  ttlText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  ttlExpiredText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
});

export default QRDisplayScreen;