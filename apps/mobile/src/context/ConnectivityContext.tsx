// ========================================
// apps/mobile/src/context/ConnectivityContext.tsx
// Contexto para estado de conectividad online/offline
// ========================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type ConnectivityContextType = {
  isConnected: boolean;
  isInternetAvailable: boolean;
  networkType: string;
  onlineEvents: () => void;
  offlineEvents: () => void;
};

const ConnectivityContext = createContext<ConnectivityContextType>({
  isConnected: true,
  isInternetAvailable: true,
  networkType: 'unknown',
  onlineEvents: () => {},
  offlineEvents: () => {},
});

export const useConnectivity = (): ConnectivityContextType => useContext(ConnectivityContext);

export const ConnectivityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetAvailable, setIsInternetAvailable] = useState<boolean>(true);
  const [networkType, setNetworkType] = useState<string>('unknown');

  useEffect(() => {
    // Fetch inicial de red de forma asíncrona
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetAvailable(state.isInternetReachable ?? true);
      setNetworkType(state.type ?? 'unknown');
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetAvailable(state.isInternetReachable ?? true);
      setNetworkType(state.type ?? 'unknown');
    });

    return () => unsubscribe();
  }, []);

  const onlineEvents = () => {
    console.log('Network is online');
  };

  const offlineEvents = () => {
    console.log('Network is offline');
  };

  return (
    <ConnectivityContext.Provider
      value={{
        isConnected,
        isInternetAvailable,
        networkType,
        onlineEvents,
        offlineEvents,
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
};