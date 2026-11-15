// ========================================
// apps/web/src/main.tsx
// Punto de entrada del Panel de Caja
// BrowserRouter está dentro de App para poder usar useNavigate en los hijos
// ========================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './main.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
