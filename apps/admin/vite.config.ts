// ========================================
// apps/admin/vite.config.ts
// Configuración de Vite para el panel administrativo
// ========================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  base: '/',
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js', 'react-router-dom'],
  },
});