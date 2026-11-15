// ========================================
// apps/web/src/App.tsx
// Panel de Caja — Login, Escaneo de visita y Validación de cupones
// ========================================

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from './services/supabase';
import type { Session } from '@supabase/supabase-js';
import { QRScanner } from './components/QRScanner';
import './main.css';

// ── Tipos ─────────────────────────────────────────────────────
interface CustomerInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  customer_code: string | null;
  total_points: number;
  visit_count: number;
}

// ── Componente: Layout ─────────────────────────────────────────
const Layout: React.FC<{ children: React.ReactNode; cashierName: string; onSignOut: () => void }> = ({
  children, cashierName, onSignOut,
}) => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    <header style={{
      background: 'var(--red)', color: '#fff', padding: '12px 24px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      boxShadow: '0 2px 6px rgba(0,0,0,.2)',
    }}>
      <span style={{ fontWeight: 700, fontSize: 18 }}>🍜 HarryWOK — Panel de Caja</span>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}>
        <span>👤 {cashierName}</span>
        <Link to="/scan"    style={{ color: '#fff', fontWeight: 600 }}>Escanear</Link>
        <Link to="/redeem"  style={{ color: '#fff', fontWeight: 600 }}>Canjear</Link>
        <button className="btn btn-ghost" style={{ color:'#fff', borderColor:'#fff', padding:'6px 14px', fontSize:13 }} onClick={onSignOut}>
          Salir
        </button>
      </div>
    </header>
    <main style={{ flex: 1, padding: 24, maxWidth: 700, margin: '0 auto', width: '100%' }}>
      {children}
    </main>
  </div>
);

// ── Página: Login ──────────────────────────────────────────────
const LoginPage: React.FC<{ onLogin: (s: Session) => void }> = ({ onLogin }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Completa todos los campos'); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }

    // Verificar que el usuario sea cajero o admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.session!.user.id)
      .single();

    if (!profile || !['cajero', 'admin'].includes(profile.role)) {
      await supabase.auth.signOut();
      setError('Acceso denegado. Solo cajeros y administradores pueden entrar aquí.');
      return;
    }

    onLogin(data.session!);
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'var(--bg)' }}>
      <div className="card" style={{ width:'100%', maxWidth:400 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--red)', marginBottom:6 }}>🍜 HarryWOK</h1>
        <p style={{ fontSize:14, color:'var(--text-sub)', marginBottom:24 }}>Panel de Caja — Acceso de Personal</p>

        {error && <div className="alert-box alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Correo electrónico</label>
            <input className="input" type="email" placeholder="cajero@harrywok.com" value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Contraseña</label>
            <input className="input" type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button className="btn btn-red btn-full" type="submit" disabled={loading}>
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Página: Escanear / Registrar Visita ────────────────────────
const ScanPage: React.FC<{ cashierId: string }> = ({ cashierId }) => {
  const [code, setCode]               = useState('');
  const [amount, setAmount]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [customer, setCustomer]       = useState<CustomerInfo | null>(null);
  const [msg, setMsg]                 = useState<{ type: 'success'|'error'|'info'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const clearState = () => {
    setCustomer(null); setMsg(null); setCode(''); setAmount('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const lookupCustomer = async (overrideCode?: string) => {
    const clean = (overrideCode || code).trim().toUpperCase();
    if (!clean) { setMsg({ type:'error', text:'Introduce un código de cliente válido.' }); return; }
    if (overrideCode) setCode(overrideCode);
    setLoading(true); setMsg(null); setCustomer(null);

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, customer_code')
      .eq('customer_code', clean)
      .maybeSingle();

    if (pErr || !profile) {
      setLoading(false);
      setMsg({ type:'error', text:`Cliente no encontrado con código "${clean}".` });
      return;
    }

    // Contar puntos y visitas
    const { count: visits } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id);

    const { data: movements } = await supabase
      .from('point_movements')
      .select('delta')
      .eq('user_id', profile.id);

    const totalPoints = (movements || []).reduce((acc, m) => acc + (m.delta || 0), 0);

    setCustomer({
      ...profile,
      total_points: Math.max(0, totalPoints),
      visit_count: visits ?? 0,
    });
    setLoading(false);
    setMsg({ type:'info', text:`Cliente identificado: ${profile.full_name || profile.customer_code}` });
  };

  const handleScanSuccess = (scannedCode: string) => {
    lookupCustomer(scannedCode);
  };

  const registerVisit = async () => {
    if (!customer) return;
    setLoading(true); setMsg(null);

    const amountVal = amount ? parseFloat(amount) : null;
    if (amount && (isNaN(amountVal!) || amountVal! < 0)) {
      setMsg({ type:'error', text:'Importe inválido.' });
      setLoading(false); return;
    }

    // Llamar Edge Function scan-visit
    const { data, error: fnErr } = await supabase.functions.invoke('scan-visit', {
      body: {
        code_manual: customer.customer_code,
        customer_code: customer.customer_code,
        local_id: '11111111-1111-1111-1111-111111111111',
        cashier_id: cashierId,
        amount: amountVal,
      },
    });

    setLoading(false);
    if (fnErr) {
      let errMsg = 'Error al registrar visita.';
      try {
        if (typeof (fnErr as any).context?.json === 'function') {
          const errBody = await (fnErr as any).context.json();
          errMsg = errBody?.error?.message || errBody?.message || errBody?.error || errMsg;
        } else if (fnErr.message) {
          errMsg = fnErr.message;
        }
      } catch {
        errMsg = fnErr.message || errMsg;
      }
      setMsg({ type: 'error', text: errMsg });
      return;
    }

    if (data && !data.ok && data.error) {
      const errMsg = typeof data.error === 'object' ? data.error.message : data.error;
      setMsg({ type: 'error', text: errMsg || 'Error al registrar visita.' });
      return;
    }

    const pointsEarned = data?.points_earned ?? data?.new_balance_puntos ?? 10;
    setMsg({
      type: 'success',
      text: `✅ Visita registrada con éxito. +${pointsEarned} puntos para ${customer.full_name || customer.customer_code}.`,
    });
    setTimeout(clearState, 3500);
  };

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>📲 Registrar Visita / Escanear QR</h2>

      <div className="card" style={{ marginBottom:20 }}>
        {/* Botón principal de escaneo con cámara */}
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-red btn-full"
            style={{ padding: '12px 20px', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => setScannerOpen(true)}
            disabled={loading}
          >
            <span style={{ fontSize: 20 }}>📷</span> Abrir Escáner de Cámara
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0', color: 'var(--text-sub)', fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
          <span>O busca por código manual</span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
        </div>

        <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:8 }}>
          Código de cliente (HW-XXXXXX)
        </label>
        <div style={{ display:'flex', gap:10 }}>
          <input
            ref={inputRef}
            className="input"
            placeholder="HW-A1B2C3"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && lookupCustomer()}
            style={{ flex:1 }}
          />
          <button className="btn btn-ghost" onClick={() => lookupCustomer()} disabled={loading || !code.trim()}>
            Buscar
          </button>
        </div>
        <p style={{ fontSize:12, color:'var(--text-sub)', marginTop:6 }}>
          Apunta la cámara al QR de la app móvil o escribe el código de 6 caracteres.
        </p>
      </div>

      {msg && <div className={`alert-box alert-${msg.type}`}>{msg.text}</div>}

      {customer && (
        <div className="card" style={{ border: '2px solid var(--green)', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <p style={{ fontWeight:700, fontSize:18 }}>{customer.full_name || 'Cliente HarryWOK'}</p>
              <p style={{ fontSize:13, color:'var(--text-sub)' }}>{customer.email || 'Sin correo asociado'}</p>
            </div>
            <span className="badge badge-ok" style={{ fontSize: 14, padding: '4px 12px' }}>{customer.customer_code}</span>
          </div>

          <div style={{ display:'flex', gap:24, marginBottom:20, flexWrap:'wrap', background: '#FAFAFA', padding: 14, borderRadius: 8 }}>
            <div style={{ textAlign:'center', flex: 1 }}>
              <p style={{ fontSize:26, fontWeight:700, color:'var(--red)' }}>{customer.total_points}</p>
              <p style={{ fontSize:12, color:'var(--text-sub)', fontWeight: 600 }}>Puntos disponibles</p>
            </div>
            <div style={{ textAlign:'center', flex: 1 }}>
              <p style={{ fontSize:26, fontWeight:700, color:'var(--red)' }}>{customer.visit_count}</p>
              <p style={{ fontSize:12, color:'var(--text-sub)', fontWeight: 600 }}>Visitas registradas</p>
            </div>
          </div>

          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>
              Importe del consumo (opcional)
            </label>
            <input className="input" type="number" min="0" step="0.01" placeholder="Ej: 12.50"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div style={{ display:'flex', flexDirection: 'column', gap:10 }}>
            <button className="btn btn-green btn-full" onClick={registerVisit} disabled={loading} style={{ padding: '12px' }}>
              {loading ? 'Procesando...' : '✅ Confirmar Visita (+10 Puntos)'}
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => navigate('/redeem', { state: { prefilledCode: customer.customer_code } })}
              >
                🎟️ Validar Cupón / Canje
              </button>
              <button className="btn btn-ghost" onClick={clearState} style={{ color: '#666', borderColor: '#ccc' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal del escáner QR con cámara */}
      <QRScanner
        isOpen={scannerOpen}
        onScan={handleScanSuccess}
        onClose={() => setScannerOpen(false)}
        title="Escanear QR de Cliente"
      />
    </div>
  );
};

// ── Página: Canjear Cupón ──────────────────────────────────────
const RedeemPage: React.FC<{ cashierId: string }> = ({ cashierId }) => {
  const [customerCode, setCustomerCode] = useState('');
  const [campaignId, setCampaignId]     = useState('');
  const [campaigns, setCampaigns]       = useState<any[]>([]);
  const [customer, setCustomer]         = useState<CustomerInfo | null>(null);
  const [loading, setLoading]           = useState(false);
  const [scannerOpen, setScannerOpen]   = useState(false);
  const [msg, setMsg]                   = useState<{ type: 'success'|'error'|'info'; text: string } | null>(null);
  const location                        = useLocation();

  useEffect(() => {
    supabase
      .from('campaigns')
      .select('id, name, description, threshold_points')
      .eq('active', true)
      .order('threshold_points')
      .then(({ data }) => setCampaigns(data || []));

    // Si viene con código prellenado desde ScanPage
    const prefilled = (location.state as any)?.prefilledCode;
    if (prefilled) {
      setCustomerCode(prefilled);
      lookupCustomer(prefilled);
    }
  }, [location.state]);

  const lookupCustomer = async (overrideCode?: string) => {
    const clean = (overrideCode || customerCode).trim().toUpperCase();
    if (!clean) { setMsg({ type:'error', text:'Introduce el código del cliente.' }); return; }
    if (overrideCode) setCustomerCode(overrideCode);
    setLoading(true); setMsg(null); setCustomer(null);

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, customer_code')
      .eq('customer_code', clean)
      .maybeSingle();

    if (pErr || !profile) {
      setLoading(false);
      setMsg({ type:'error', text:`Cliente no encontrado con código "${clean}".` });
      return;
    }

    const { data: movements } = await supabase
      .from('point_movements')
      .select('delta')
      .eq('user_id', profile.id);

    const totalPoints = (movements || []).reduce((acc: number, m: any) => acc + (m.delta || 0), 0);

    const { count: visits } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id);

    setCustomer({ ...profile, total_points: Math.max(0, totalPoints), visit_count: visits ?? 0 });
    setLoading(false);
    setMsg({ type:'info', text:`Cliente cargado: ${profile.full_name || profile.customer_code}` });
  };

  const handleScanSuccess = (scannedCode: string) => {
    lookupCustomer(scannedCode);
  };

  const executeCouponRedeem = async () => {
    if (!customer || !campaignId) {
      setMsg({ type:'error', text:'Selecciona un cliente y una campaña.' });
      return;
    }

    const selected = campaigns.find(c => c.id === campaignId);
    if (selected && customer.total_points < selected.threshold_points) {
      setMsg({
        type: 'error',
        text: `Puntos insuficientes. Necesita ${selected.threshold_points} pts, tiene ${customer.total_points}.`,
      });
      return;
    }

    setLoading(true); setMsg(null);

    const { data, error: fnErr } = await supabase.functions.invoke('redeem', {
      body: {
        customer_code: customer.customer_code,
        campaign_id: campaignId,
        cashier_id: cashierId,
      },
    });

    setLoading(false);
    if (fnErr) {
      let errMsg = 'Error en el canje.';
      try {
        if (typeof (fnErr as any).context?.json === 'function') {
          const errBody = await (fnErr as any).context.json();
          errMsg = errBody?.error?.message || errBody?.message || errBody?.error || errMsg;
        } else if (fnErr.message) {
          errMsg = fnErr.message;
        }
      } catch {
        errMsg = fnErr.message || errMsg;
      }
      setMsg({ type: 'error', text: errMsg });
      return;
    }

    if (data && !data.ok && data.error) {
      const errMsg = typeof data.error === 'object' ? data.error.message : data.error;
      setMsg({ type: 'error', text: errMsg || 'Error en el canje.' });
      return;
    }

    setMsg({
      type: 'success',
      text: `🎉 Canje exitoso para ${customer.full_name || customer.customer_code}. Cupón generado: ${data?.coupon_code || '—'}.`,
    });
    setCustomer(null); setCustomerCode(''); setCampaignId('');
  };

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>🎟️ Validar Cupón / Canjear Puntos</h2>

      <div className="card" style={{ marginBottom:20 }}>
        {/* Botón para escanear con cámara */}
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-red btn-full"
            style={{ padding: '12px 20px', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => setScannerOpen(true)}
            disabled={loading}
          >
            <span style={{ fontSize: 20 }}>📷</span> Escanear QR para Canje
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0', color: 'var(--text-sub)', fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
          <span>O ingresa el código del cliente</span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
        </div>

        <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:8 }}>
          Código de cliente (HW-XXXXXX)
        </label>
        <div style={{ display:'flex', gap:10 }}>
          <input className="input" placeholder="HW-A1B2C3" value={customerCode}
            onChange={e => setCustomerCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && lookupCustomer()} style={{ flex:1 }} />
          <button className="btn btn-ghost" onClick={() => lookupCustomer()} disabled={loading || !customerCode.trim()}>
            Buscar
          </button>
        </div>
      </div>

      {msg && <div className={`alert-box alert-${msg.type}`}>{msg.text}</div>}

      {customer && (
        <div className="card">
          <div style={{ marginBottom:16 }}>
            <p style={{ fontWeight:700, fontSize:16 }}>{customer.full_name || 'Sin nombre'}</p>
            <p style={{ fontSize:13, color:'var(--text-sub)' }}>{customer.customer_code}</p>
            <p style={{ fontSize:20, fontWeight:700, color:'var(--red)', marginTop:8 }}>
              {customer.total_points} puntos disponibles
            </p>
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:8 }}>
              Seleccionar recompensa:
            </label>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {campaigns.map(c => {
                const canAfford = customer.total_points >= c.threshold_points;
                return (
                  <label key={c.id} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:12, borderRadius:'var(--radius)', border:'1.5px solid',
                    borderColor: campaignId === c.id ? 'var(--red)' : 'var(--border)',
                    background: campaignId === c.id ? '#fdecea' : canAfford ? '#fff' : '#f9f9f9',
                    cursor: canAfford ? 'pointer' : 'not-allowed', opacity: canAfford ? 1 : 0.6,
                  }}>
                    <div>
                      <input type="radio" name="campaign" value={c.id} disabled={!canAfford}
                        checked={campaignId === c.id} onChange={() => setCampaignId(c.id)} style={{ marginRight:8 }} />
                      <strong style={{ fontSize:14 }}>{c.name}</strong>
                      {c.description && <p style={{ fontSize:12, color:'var(--text-sub)', marginTop:2 }}>{c.description}</p>}
                    </div>
                    <span className={`badge ${canAfford ? 'badge-ok' : 'badge-error'}`}>
                      {c.threshold_points} pts
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-green btn-full" onClick={executeCouponRedeem} disabled={loading || !campaignId}>
              {loading ? 'Procesando canje...' : '🎁 Aplicar Canje'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setCustomer(null); setCustomerCode(''); setCampaignId(''); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal del escáner QR con cámara */}
      <QRScanner
        isOpen={scannerOpen}
        onScan={handleScanSuccess}
        onClose={() => setScannerOpen(false)}
        title="Escanear QR para Canje"
      />
    </div>
  );
};

// ── Página: Home (Dashboard rápido) ───────────────────────────
const HomePage: React.FC<{ cashierName: string }> = ({ cashierName }) => {
  const navigate = useNavigate();
  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Bienvenido, {cashierName}</h2>
      <p style={{ color:'var(--text-sub)', marginBottom:24, fontSize:14 }}>
        Sistema de fidelización HarryWOK — Panel de Caja
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div className="card" style={{ cursor:'pointer', borderLeft:'4px solid var(--red)' }}
          onClick={() => navigate('/scan')}>
          <p style={{ fontSize:28 }}>📲</p>
          <p style={{ fontWeight:700, marginTop:8 }}>Escanear / Visita</p>
          <p style={{ fontSize:13, color:'var(--text-sub)', marginTop:4 }}>
            Registra la visita del cliente y acumula puntos automáticamente.
          </p>
        </div>
        <div className="card" style={{ cursor:'pointer', borderLeft:'4px solid var(--green)' }}
          onClick={() => navigate('/redeem')}>
          <p style={{ fontSize:28 }}>🎟️</p>
          <p style={{ fontWeight:700, marginTop:8 }}>Validar Cupón</p>
          <p style={{ fontSize:13, color:'var(--text-sub)', marginTop:4 }}>
            Canjea los puntos del cliente por un beneficio de campaña.
          </p>
        </div>
      </div>
    </div>
  );
};

// ── App raíz ───────────────────────────────────────────────────
export function App() {
  const [session, setSession]       = useState<Session | null>(null);
  const [cashierName, setCashierName] = useState('Cajero');
  const [ready, setReady]           = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s) await loadName(s.user.id);
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s) await loadName(s.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadName = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('full_name, role').eq('id', uid).single();
    if (data?.full_name) setCashierName(data.full_name);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (!ready) return <div style={{ textAlign:'center', padding:60 }}>Cargando...</div>;

  if (!session) return <LoginPage onLogin={s => setSession(s)} />;

  return (
    <BrowserRouter>
      <Layout cashierName={cashierName} onSignOut={handleSignOut}>
        <Routes>
          <Route path="/"        element={<HomePage cashierName={cashierName} />} />
          <Route path="/scan"    element={<ScanPage cashierId={session.user.id} />} />
          <Route path="/redeem"  element={<RedeemPage cashierId={session.user.id} />} />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;