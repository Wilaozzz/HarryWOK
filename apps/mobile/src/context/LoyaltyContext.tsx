// ========================================
// apps/mobile/src/context/LoyaltyContext.tsx
// Contexto para estado de fidelización reactivo (sellos + puntos)
// ========================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { PointMovement } from '@shared/types/entities';

type LoyaltyContextType = {
  pointsBalance: number;
  stampCount: number;
  totalVisits: number;
  level: string;
  discount: string;
  isCycleComplete: boolean;
  history: PointMovement[];
  isLoading: boolean;
  loadLoyaltyData: () => Promise<void>;
  simulateLocalVisit?: () => void;
};

const LoyaltyContext = createContext<LoyaltyContextType>({
  pointsBalance: 0,
  stampCount: 0,
  totalVisits: 0,
  level: 'bronce',
  discount: '10%',
  isCycleComplete: false,
  history: [],
  isLoading: false,
  loadLoyaltyData: async () => {},
});

export const useLoyalty = (): LoyaltyContextType => useContext(LoyaltyContext);

export const LoyaltyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [pointsBalance, setPointsBalance] = useState(0);
  const [stampCount, setStampCount] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);
  const [level, setLevel] = useState('bronce');
  const [discount, setDiscount] = useState('10%');
  const [isCycleComplete, setIsCycleComplete] = useState(false);
  const [history, setHistory] = useState<PointMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getLevelForVisits = (visits: number) => {
    if (visits >= 50) return { level: 'oro', discount: '100%' };
    if (visits >= 10) return { level: 'plata', discount: '20%' };
    if (visits >= 5) return { level: 'bronce', discount: '10%' };
    return { level: 'bronce', discount: '10%' };
  };

  const loadLoyaltyData = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      const userId = session.user.id;

      // 1. Obtener conteo real de visitas de la tabla visits
      const { count: visitsCount } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const visits = visitsCount || 0;
      setTotalVisits(visits);

      // 2. Obtener movimientos de puntos de point_movements
      const { data: movements, error: movementsError } = await supabase
        .from('point_movements')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (movementsError) {
        console.warn('Error fetching point_movements:', movementsError.message);
      }

      let points = 0;
      let stamps = 0;

      if (movements && movements.length > 0) {
        movements.forEach((mov) => {
          if (mov.kind === 'canje') {
            points -= Math.abs(mov.delta);
          } else if (mov.kind === 'acumulo' && mov.reason !== 'visita' && mov.reason !== 'sello_visita') {
            points += mov.delta;
          } else if (mov.kind === 'ajuste_admin') {
            points += mov.delta;
          }

          if (mov.reason === 'visita' || mov.reason === 'sello_visita') {
            if (mov.balance_after) {
              stamps = Math.max(stamps, mov.balance_after % 5 || (mov.balance_after === 5 ? 5 : 0));
            }
          }
        });

        // Asegurar que puntos no sea negativo
        points = Math.max(0, points);
      }

      // Si no hay movimientos en DB pero hay visitas registradas, deducir sellos
      if (stamps === 0 && visits > 0) {
        stamps = (visits % 5) === 0 ? 5 : (visits % 5);
      }

      setPointsBalance(points);
      setStampCount(stamps);
      setIsCycleComplete(stamps >= 5);

      const levelInfo = getLevelForVisits(visits);
      setLevel(levelInfo.level);
      setDiscount(levelInfo.discount);
      setHistory(movements || []);
    } catch (err) {
      console.error('Error loading loyalty data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Método opcional sólo para previsualización local en desarrollo
  const simulateLocalVisit = () => {
    const nextStamps = (stampCount % 5) + 1;
    const nextVisits = totalVisits + 1;
    const nextPoints = pointsBalance + 10;
    setStampCount(nextStamps);
    setTotalVisits(nextVisits);
    setPointsBalance(nextPoints);
    setIsCycleComplete(nextStamps === 5);
    const levelInfo = getLevelForVisits(nextVisits);
    setLevel(levelInfo.level);
    setDiscount(levelInfo.discount);
  };

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  return (
    <LoyaltyContext.Provider
      value={{
        pointsBalance,
        stampCount,
        totalVisits,
        level,
        discount,
        isCycleComplete,
        history,
        isLoading,
        loadLoyaltyData,
        simulateLocalVisit,
      }}
    >
      {children}
    </LoyaltyContext.Provider>
  );
};