// ========================================
// apps/admin/src/main.tsx
// Punto de entrada del Panel Administrativo
// BrowserRouter vive dentro de AdminApp.tsx
// ========================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminApp } from './AdminApp';
import './main.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
