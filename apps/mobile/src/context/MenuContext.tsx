// ========================================
// apps/mobile/src/context/MenuContext.tsx
// Contexto para estado del menú digital
// ========================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { Category, MenuItem } from '@shared/types/entities';

type MenuContextType = {
  categories: Category[];
  menuItems: MenuItem[];
  isLoading: boolean;
  error: string | null;
  refreshMenu: () => Promise<void>;
  filterByCategory: (categoryId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

const MenuContext = createContext<MenuContextType>({
  categories: [],
  menuItems: [],
  isLoading: true,
  error: null,
  refreshMenu: async () => {},
  filterByCategory: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
});

export const useMenu = (): MenuContextType => useContext(MenuContext);

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshMenu = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true);
      
      if (categoriesError) throw categoriesError;
      
      const { data: menuItemsData, error: menuItemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)
        .is('deleted_at', null);
      
      if (menuItemsError) throw menuItemsError;
      
      setCategories(categoriesData || []);
      setMenuItems(menuItemsData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshMenu();
  }, []);

  const filterByCategory = (categoryId: string) => {
    // Implementación de filtrado
  };

  return (
    <MenuContext.Provider
      value={{
        categories,
        menuItems,
        isLoading,
        error,
        refreshMenu,
        filterByCategory,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
};