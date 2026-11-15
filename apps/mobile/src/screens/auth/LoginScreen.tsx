// ========================================
// apps/mobile/src/screens/auth/LoginScreen.tsx
// Pantalla de autenticación y registro de usuarios (Contraseña y OTP)
// ========================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useConnectivity } from '../../context/ConnectivityContext';

type AuthMode = 'password' | 'otp';
type PasswordAction = 'login' | 'register';

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const { login, signup, signInWithGoogle, checkConsent, loading } = useAuth();
  const { isInternetAvailable } = useConnectivity();

  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [passwordAction, setPasswordAction] = useState<PasswordAction>('register');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordSubmit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Introduce un correo electrónico válido');
      return;
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!isInternetAvailable) {
      Alert.alert('Sin conexión', 'No hay conexión a internet.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      if (passwordAction === 'register') {
        await signup(cleanEmail, password, fullName.trim() || undefined);
        const hasConsent = await checkConsent();
        Alert.alert(
          'Registro Exitoso',
          'Tu cuenta de cliente HarryWOK ha sido creada correctamente.',
          [
            {
              text: 'Continuar',
              onPress: () => {
                if (!hasConsent) {
                  router.replace('/(auth)/consent');
                } else {
                  router.replace('/(tabs)/menu');
                }
              },
            },
          ]
        );
      } else {
        await login(cleanEmail, password);
        const hasConsent = await checkConsent();
        if (!hasConsent) {
          router.replace('/(auth)/consent');
        } else {
          router.replace('/(tabs)/menu');
        }
      }
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('user_already_exists')) {
        setError('Este correo electrónico ya está registrado. Por favor, cambia a "Iniciar Sesión".');
      } else if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
        setError('Correo electrónico o contraseña incorrectos.');
      } else if (msg.includes('email not confirmed')) {
        setError('Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.');
      } else {
        setError(err?.message || 'Error en la autenticación. Verifica tus datos.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSubmit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Introduce un correo electrónico válido');
      return;
    }
    if (!isInternetAvailable) {
      Alert.alert('Sin conexión', 'No hay conexión a internet.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await login(cleanEmail);
      router.push({
        pathname: '/(auth)/otp',
        params: { email: cleanEmail },
      });
    } catch (err: any) {
      setError(err.message || 'Error al enviar código OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isInternetAvailable) {
      Alert.alert('Sin conexión', 'No hay conexión a internet.');
      return;
    }
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>HarryWOK</Text>
          <Text style={styles.brandSubtitle}>App de Fidelización y Menú Digital</Text>
        </View>

        {/* Selector de Modo: Contraseña vs OTP */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, authMode === 'password' && styles.modeTabActive]}
            onPress={() => {
              setAuthMode('password');
              setError(null);
            }}
          >
            <Text style={[styles.modeTabText, authMode === 'password' && styles.modeTabTextActive]}>
              Correo y Contraseña
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, authMode === 'otp' && styles.modeTabActive]}
            onPress={() => {
              setAuthMode('otp');
              setError(null);
            }}
          >
            <Text style={[styles.modeTabText, authMode === 'otp' && styles.modeTabTextActive]}>
              Código OTP
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {authMode === 'password' ? (
          <>
            {/* Sub-selector: Iniciar Sesión vs Registrarse */}
            <View style={styles.actionToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, passwordAction === 'register' && styles.toggleBtnActive]}
                onPress={() => {
                  setPasswordAction('register');
                  setError(null);
                }}
              >
                <Text style={[styles.toggleBtnText, passwordAction === 'register' && styles.toggleBtnTextActive]}>
                  Registrarse
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, passwordAction === 'login' && styles.toggleBtnActive]}
                onPress={() => {
                  setPasswordAction('login');
                  setError(null);
                }}
              >
                <Text style={[styles.toggleBtnText, passwordAction === 'login' && styles.toggleBtnTextActive]}>
                  Iniciar Sesión
                </Text>
              </TouchableOpacity>
            </View>

            {passwordAction === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre Completo (Opcional)</Text>
                <TextInput
                  placeholder="Tu nombre y apellido"
                  value={fullName}
                  onChangeText={setFullName}
                  style={styles.input}
                  placeholderTextColor="#9E9E9E"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <TextInput
                placeholder="cliente@ejemplo.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                placeholderTextColor="#9E9E9E"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholderTextColor="#9E9E9E"
              />
            </View>

            <View style={styles.actions}>
              <Button
                title={
                  submitting
                    ? 'Procesando...'
                    : passwordAction === 'register'
                    ? 'Crear Cuenta de Cliente'
                    : 'Entrar a HarryWOK'
                }
                onPress={handlePasswordSubmit}
                color="#D32F2F"
                disabled={submitting}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo Electrónico para OTP</Text>
              <TextInput
                placeholder="cliente@ejemplo.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                placeholderTextColor="#9E9E9E"
              />
            </View>

            <View style={styles.actions}>
              <Button
                title={submitting ? 'Enviando código...' : 'Continuar con OTP'}
                onPress={handleOtpSubmit}
                color="#D32F2F"
                disabled={submitting}
              />
            </View>
          </>
        )}

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>O</Text>
          <View style={styles.line} />
        </View>

        <Button
          title="Continuar con Google"
          onPress={handleGoogleLogin}
          color="#1976D2"
          disabled={submitting}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  container: {
    padding: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#D32F2F',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  modeTabText: {
    fontSize: 13,
    color: '#616161',
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  actionToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  toggleBtnActive: {
    backgroundColor: '#FFEBEE',
    borderColor: '#D32F2F',
  },
  toggleBtnText: {
    fontSize: 13,
    color: '#616161',
  },
  toggleBtnTextActive: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: '#FDE8E8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#424242',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#BDBDBD',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#212121',
  },
  actions: {
    marginTop: 8,
    marginBottom: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#9E9E9E',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default LoginScreen;