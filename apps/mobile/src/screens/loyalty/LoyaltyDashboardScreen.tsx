// ========================================
// apps/mobile/src/screens/loyalty/LoyaltyDashboardScreen.tsx
// Dashboard de fidelización: puntos, sellos (X de 5) y nivel (RF-12)
// ========================================

import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLoyalty } from '../../context/LoyaltyContext';

const LoyaltyDashboardScreen: React.FC = () => {
  const {
    pointsBalance,
    stampCount,
    totalVisits,
    level,
    discount,
    loadLoyaltyData,
    isLoading,
    simulateLocalVisit,
  } = useLoyalty();

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Beneficios</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => loadLoyaltyData()}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#D32F2F" />
          ) : (
            <Text style={styles.refreshText}>Actualizar</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Tarjeta de Puntos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Puntos Acumulados</Text>
        <Text style={styles.pointsValue}>{pointsBalance}</Text>
        <Text style={styles.cardSubtitle}>
          Acumula puntos por visita en caja y canjéalos por platos y bebidas.
        </Text>
      </View>

      {/* Tarjeta de Sellos (Ciclo de 5) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ciclo de Sellos</Text>
        <View style={styles.stampsContainer}>
          {[1, 2, 3, 4, 5].map((index) => (
            <View
              key={index}
              style={[
                styles.stampCircle,
                index <= stampCount && styles.activeStampCircle,
              ]}
            >
              <Text
                style={[
                  styles.stampText,
                  index <= stampCount && styles.activeStampText,
                ]}
              >
                {index}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.cardSubtitle}>
          {stampCount}/5 sellos completados en este ciclo. Al llegar a 5, el cajero activará tu recompensa de nivel.
        </Text>
      </View>

      {/* Tarjeta de Nivel */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nivel de Fidelización</Text>
        <Text style={styles.levelValue}>{level.toUpperCase()}</Text>
        <Text style={styles.cardSubtitle}>
          Visitas acumuladas: {totalVisits} | Beneficio actual: {discount} de descuento
        </Text>
      </View>

      {/* Simulación en entorno de desarrollo */}
      {simulateLocalVisit && (
        <View style={styles.devContainer}>
          <Text style={styles.devLabel}>Modo Prueba / Simulación Local:</Text>
          <Button
            title="Simular Visita Local (+1 Sello)"
            onPress={simulateLocalVisit}
            color="#FF6F00"
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FAFAFA',
    flexGrow: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  refreshButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#EEEEEE',
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#424242',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    elevation: 1,
  },
  cardTitle: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pointsValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 4,
  },
  levelValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6F00',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  stampsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
    marginVertical: 14,
  },
  stampCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BDBDBD',
  },
  activeStampCircle: {
    backgroundColor: '#D32F2F',
    borderColor: '#B71C1C',
  },
  stampText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#757575',
  },
  activeStampText: {
    color: '#FFFFFF',
  },
  devContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  devLabel: {
    fontSize: 11,
    color: '#B78103',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
});

export default LoyaltyDashboardScreen;