// ========================================
// apps/admin/src/AdminApp.tsx
// Panel Administrativo — Login, Menú CRUD, Campañas CRUD, Dashboard
// ========================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate,
} from 'react-router-dom';
import { supabase } from './services/supabase';
import type { Session } from '@supabase/supabase-js';
import './main.css';

// ── Tipos locales ──────────────────────────────────────────────
interface Category { id: string; name: string; sort_order: number; active: boolean; }

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  deleted_at: string | null;
  sort_order: number;
  allergens: string[] | null;
  dietary_tags: string[] | null;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  threshold_points: number;
  reward_type: string;
  active: boolean;
  expires_at: string | null;
}

interface DashboardStats {
  totalUsers: number;
  totalVisitsToday: number;
  totalVisitsMonth: number;
  totalRedemptions: number;
  activeMenuItems: number;
  activeCampaigns: number;
}

// ── Alerta helper ──────────────────────────────────────────────
const Alert: React.FC<{ msg: { type: 'success'|'error'|'info'; text: string } | null }> = ({ msg }) => {
  if (!msg) return null;
  return <div className={`alert alert-${msg.type}`}>{msg.text}</div>;
};

// ── Modal genérico ─────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h3 style={{ fontSize:17, fontWeight:700 }}>{title}</h3>
        <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#999' }}>×</button>
      </div>
      {children}
    </div>
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
    if (!email || !password) { setError('Completa todos los campos'); return; }
    setLoading(true); setError(null);

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password,
    });

    if (authErr) { setError(authErr.message); setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.session!.user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      await supabase.auth.signOut();
      setError('Acceso denegado. Solo administradores pueden entrar aquí.');
      setLoading(false); return;
    }

    onLogin(data.session!);
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:24 }}>
      <div className="card" style={{ width:'100%', maxWidth:400 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--red)', marginBottom:4 }}>🍜 HarryWOK</h1>
        <p style={{ fontSize:14, color:'var(--text-sub)', marginBottom:24 }}>Panel Administrativo</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Email</label>
            <input className="input" type="email" placeholder="admin@harrywok.com"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Contraseña</label>
            <input className="input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-red btn-full" type="submit" disabled={loading}>
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Página: Dashboard ──────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [users, visToday, visMon, redempts, menuAct, camps] = await Promise.all([
        supabase.from('profiles').select('*', { count:'exact', head:true }).eq('role','cliente'),
        supabase.from('visits').select('*', { count:'exact', head:true }).gte('visited_day', today),
        supabase.from('visits').select('*', { count:'exact', head:true }).gte('created_at', monthStart),
        supabase.from('redemptions').select('*', { count:'exact', head:true }),
        supabase.from('menu_items').select('*', { count:'exact', head:true }).eq('available', true).is('deleted_at', null),
        supabase.from('campaigns').select('*', { count:'exact', head:true }).eq('active', true),
      ]);

      setStats({
        totalUsers: users.count ?? 0,
        totalVisitsToday: visToday.count ?? 0,
        totalVisitsMonth: visMon.count ?? 0,
        totalRedemptions: redempts.count ?? 0,
        activeMenuItems: menuAct.count ?? 0,
        activeCampaigns: camps.count ?? 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const tiles = stats ? [
    { icon:'👤', label:'Clientes registrados',  val: stats.totalUsers },
    { icon:'📲', label:'Visitas hoy',           val: stats.totalVisitsToday },
    { icon:'📅', label:'Visitas este mes',       val: stats.totalVisitsMonth },
    { icon:'🎟️', label:'Canjes totales',         val: stats.totalRedemptions },
    { icon:'🍽️', label:'Platos activos en menú', val: stats.activeMenuItems },
    { icon:'📣', label:'Campañas activas',       val: stats.activeCampaigns },
  ] : [];

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>📊 Dashboard</h2>
      {loading ? <p>Cargando estadísticas...</p> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16 }}>
          {tiles.map(t => (
            <div key={t.label} className="card" style={{ textAlign:'center' }}>
              <p style={{ fontSize:32 }}>{t.icon}</p>
              <p style={{ fontSize:28, fontWeight:700, color:'var(--red)', marginTop:6 }}>{t.val}</p>
              <p style={{ fontSize:12, color:'var(--text-sub)', marginTop:4 }}>{t.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Página: Gestión de Menú ────────────────────────────────────
const MenuPage: React.FC = () => {
  const LOCAL_ID = '11111111-1111-1111-1111-111111111111'; // Seed local

  const [items, setItems]           = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [modal, setModal]           = useState<'create'|'edit'|null>(null);
  const [editing, setEditing]       = useState<MenuItem | null>(null);
  const [msg, setMsg]               = useState<{ type:'success'|'error'|'info'; text:string }|null>(null);
  const [saving, setSaving]         = useState(false);

  // Form state
  const [form, setForm] = useState({
    category_id: '', name: '', description: '', price: '',
    available: true, sort_order: '0', allergens: '', dietary_tags: '',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: cats }, { data: its }] = await Promise.all([
      supabase.from('categories').select('*').eq('local_id', LOCAL_ID).order('sort_order'),
      supabase.from('menu_items').select('*').eq('local_id', LOCAL_ID).order('sort_order'),
    ]);
    setCategories(cats || []);
    setItems(its || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openCreate = () => {
    setEditing(null);
    setForm({ category_id: categories[0]?.id || '', name:'', description:'', price:'', available:true, sort_order:'0', allergens:'', dietary_tags:'' });
    setModal('create');
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({
      category_id: item.category_id,
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      available: item.available,
      sort_order: item.sort_order.toString(),
      allergens: (item.allergens || []).join(', '),
      dietary_tags: (item.dietary_tags || []).join(', '),
    });
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditing(null); setMsg(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || !form.category_id) {
      setMsg({ type:'error', text:'Nombre, precio y categoría son obligatorios.' }); return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setMsg({ type:'error', text:'Precio inválido.' }); return; }

    setSaving(true); setMsg(null);
    const payload = {
      category_id: form.category_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      available: form.available,
      sort_order: parseInt(form.sort_order) || 0,
      allergens: form.allergens ? form.allergens.split(',').map(s=>s.trim()).filter(Boolean) : null,
      dietary_tags: form.dietary_tags ? form.dietary_tags.split(',').map(s=>s.trim()).filter(Boolean) : null,
      local_id: LOCAL_ID,
    };

    let err;
    if (modal === 'create') {
      ({ error: err } = await supabase.from('menu_items').insert(payload));
    } else if (editing) {
      ({ error: err } = await supabase.from('menu_items').update({ ...payload, deleted_at: null }).eq('id', editing.id));
    }

    setSaving(false);
    if (err) { setMsg({ type:'error', text: err.message }); return; }
    await loadAll(); closeModal();
  };

  const softDelete = async (id: string) => {
    if (!confirm('¿Dar de baja este plato? Puedes reactivarlo más tarde.')) return;
    const { error } = await supabase.from('menu_items').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) alert(error.message);
    else await loadAll();
  };

  const restore = async (id: string) => {
    const { error } = await supabase.from('menu_items').update({ deleted_at: null }).eq('id', id);
    if (error) alert(error.message);
    else await loadAll();
  };

  const catName = (id: string) => categories.find(c => c.id === id)?.name || id;

  const filtered = items.filter(i => showDeleted ? true : !i.deleted_at);

  const FormPanel = (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Alert msg={msg} />
      <div>
        <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Categoría *</label>
        <select className="select" value={form.category_id} onChange={e => setForm(f=>({...f,category_id:e.target.value}))}>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Nombre *</label>
        <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Wok Especial" />
      </div>
      <div>
        <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Descripción</label>
        <textarea className="textarea" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Descripción del plato..." />
      </div>
      <div style={{ display:'flex', gap:12 }}>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Precio * (\$)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="8.50" />
        </div>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Orden de visualización</label>
          <input className="input" type="number" min="0" value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:e.target.value}))} />
        </div>
      </div>
      <div>
        <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Alérgenos (separados por coma)</label>
        <input className="input" value={form.allergens} onChange={e=>setForm(f=>({...f,allergens:e.target.value}))} placeholder="gluten, soja, marisco" />
      </div>
      <div>
        <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Etiquetas dietéticas (separadas por coma)</label>
        <input className="input" value={form.dietary_tags} onChange={e=>setForm(f=>({...f,dietary_tags:e.target.value}))} placeholder="vegano, sin gluten" />
      </div>
      <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:14 }}>
        <input type="checkbox" checked={form.available} onChange={e=>setForm(f=>({...f,available:e.target.checked}))} />
        Disponible en carta
      </label>
      <div style={{ display:'flex', gap:10, marginTop:8 }}>
        <button className="btn btn-red btn-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : modal === 'create' ? 'Crear Plato' : 'Guardar Cambios'}
        </button>
        <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <h2 style={{ fontSize:20, fontWeight:700 }}>🍽️ Gestión de Menú</h2>
        <div style={{ display:'flex', gap:10 }}>
          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer' }}>
            <input type="checkbox" checked={showDeleted} onChange={e=>setShowDeleted(e.target.checked)} />
            Mostrar dados de baja
          </label>
          <button className="btn btn-red" onClick={openCreate}>+ Nuevo Plato</button>
        </div>
      </div>

      {loading ? <p>Cargando menú...</p> : (
        <div className="card" style={{ padding:0, overflow:'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
                <th style={{ minWidth:140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-sub)', padding:24 }}>
                  No hay platos. Crea el primero con "+ Nuevo Plato".
                </td></tr>
              )}
              {filtered.map(item => (
                <tr key={item.id} style={{ opacity: item.deleted_at ? .5 : 1 }}>
                  <td>
                    <p style={{ fontWeight:600 }}>{item.name}</p>
                    {item.description && <p style={{ fontSize:12, color:'var(--text-sub)' }}>{item.description}</p>}
                  </td>
                  <td>{catName(item.category_id)}</td>
                  <td>\${item.price.toFixed(2)}</td>
                  <td>
                    {item.deleted_at
                      ? <span className="badge badge-off">Baja</span>
                      : item.available
                        ? <span className="badge badge-ok">Activo</span>
                        : <span className="badge badge-warn">Oculto</span>}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      {!item.deleted_at && (
                        <button className="btn btn-amber btn-sm" onClick={() => openEdit(item)}>Editar</button>
                      )}
                      {item.deleted_at
                        ? <button className="btn btn-green btn-sm" onClick={() => restore(item.id)}>Restaurar</button>
                        : <button className="btn btn-danger btn-sm" onClick={() => softDelete(item.id)}>Dar de baja</button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Nuevo Plato' : `Editar: ${editing?.name}`} onClose={closeModal}>
          {FormPanel}
        </Modal>
      )}
    </div>
  );
};

// ── Página: Gestión de Campañas ────────────────────────────────
const CampaignsPage: React.FC = () => {
  const LOCAL_ID = '11111111-1111-1111-1111-111111111111';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<'create'|'edit'|null>(null);
  const [editing, setEditing]     = useState<Campaign | null>(null);
  const [msg, setMsg]             = useState<{ type:'success'|'error'|'info'; text:string }|null>(null);
  const [saving, setSaving]       = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', threshold_points: '30',
    reward_type: 'punto', active: true, expires_at: '',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('local_id', LOCAL_ID)
      .order('threshold_points');
    setCampaigns(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name:'', description:'', threshold_points:'30', reward_type:'punto', active:true, expires_at:'' });
    setModal('create');
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name, description: c.description || '',
      threshold_points: c.threshold_points.toString(),
      reward_type: c.reward_type, active: c.active,
      expires_at: c.expires_at ? c.expires_at.slice(0,10) : '',
    });
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditing(null); setMsg(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { setMsg({ type:'error', text:'El nombre es obligatorio.' }); return; }
    const threshold = parseInt(form.threshold_points);
    if (isNaN(threshold) || threshold < 1) { setMsg({ type:'error', text:'Puntos requeridos inválido.' }); return; }

    setSaving(true); setMsg(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      threshold_points: threshold,
      reward_type: form.reward_type,
      active: form.active,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      local_id: LOCAL_ID,
    };

    let err;
    if (modal === 'create') {
      ({ error: err } = await supabase.from('campaigns').insert(payload));
    } else if (editing) {
      ({ error: err } = await supabase.from('campaigns').update(payload).eq('id', editing.id));
    }

    setSaving(false);
    if (err) { setMsg({ type:'error', text: err.message }); return; }
    await loadAll(); closeModal();
  };

  const toggleActive = async (c: Campaign) => {
    const { error } = await supabase.from('campaigns').update({ active: !c.active }).eq('id', c.id);
    if (error) alert(error.message);
    else await loadAll();
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña permanentemente?')) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) alert(error.message);
    else await loadAll();
  };

  const FormPanel = (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Alert msg={msg} />
      <div>
        <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Nombre de la campaña *</label>
        <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Cupón Bebida Gratis" />
      </div>
      <div>
        <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Descripción</label>
        <textarea className="textarea" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Descripción para el cliente..." />
      </div>
      <div style={{ display:'flex', gap:12 }}>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Puntos requeridos *</label>
          <input className="input" type="number" min="1" value={form.threshold_points}
            onChange={e=>setForm(f=>({...f,threshold_points:e.target.value}))} />
        </div>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Tipo de recompensa</label>
          <select className="select" value={form.reward_type} onChange={e=>setForm(f=>({...f,reward_type:e.target.value}))}>
            <option value="punto">Punto</option>
            <option value="sello">Sello</option>
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>Fecha de expiración (opcional)</label>
        <input className="input" type="date" value={form.expires_at} onChange={e=>setForm(f=>({...f,expires_at:e.target.value}))} />
      </div>
      <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:14 }}>
        <input type="checkbox" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} />
        Campaña activa
      </label>
      <div style={{ display:'flex', gap:10, marginTop:8 }}>
        <button className="btn btn-red btn-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : modal === 'create' ? 'Crear Campaña' : 'Guardar Cambios'}
        </button>
        <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:700 }}>📣 Gestión de Campañas</h2>
        <button className="btn btn-red" onClick={openCreate}>+ Nueva Campaña</button>
      </div>

      {loading ? <p>Cargando campañas...</p> : (
        <div className="card" style={{ padding:0, overflow:'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Puntos req.</th>
                <th>Tipo</th>
                <th>Expiración</th>
                <th>Estado</th>
                <th style={{ minWidth:160 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-sub)', padding:24 }}>
                  No hay campañas. Crea la primera.
                </td></tr>
              )}
              {campaigns.map(c => (
                <tr key={c.id}>
                  <td>
                    <p style={{ fontWeight:600 }}>{c.name}</p>
                    {c.description && <p style={{ fontSize:12, color:'var(--text-sub)' }}>{c.description}</p>}
                  </td>
                  <td style={{ fontWeight:700, color:'var(--red)' }}>{c.threshold_points} pts</td>
                  <td><span className="badge badge-blue">{c.reward_type}</span></td>
                  <td style={{ fontSize:13 }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('es') : '—'}</td>
                  <td>
                    {c.active
                      ? <span className="badge badge-ok">Activa</span>
                      : <span className="badge badge-off">Inactiva</span>}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-amber btn-sm" onClick={() => openEdit(c)}>Editar</button>
                      <button
                        className={`btn btn-sm ${c.active ? 'btn-ghost' : 'btn-green'}`}
                        onClick={() => toggleActive(c)}>
                        {c.active ? 'Pausar' : 'Activar'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteCampaign(c.id)}>Borrar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Nueva Campaña' : `Editar: ${editing?.name}`} onClose={closeModal}>
          {FormPanel}
        </Modal>
      )}
    </div>
  );
};

// ── Página: Usuarios ───────────────────────────────────────────
const UsersPage: React.FC = () => {
  const [users, setUsers]   = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, customer_code, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setUsers(data || []); setLoading(false); });
  }, []);

  const filtered = users.filter(u =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.customer_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>👥 Usuarios</h2>
      <div style={{ marginBottom:16 }}>
        <input className="input" style={{ maxWidth:320 }} placeholder="Buscar por nombre, email o código..."
          value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      {loading ? <p>Cargando usuarios...</p> : (
        <div className="card" style={{ padding:0, overflow:'auto' }}>
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Código</th><th>Rol</th><th>Registro</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-sub)', padding:24 }}>
                  Sin resultados.
                </td></tr>
              )}
              {filtered.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight:600 }}>{u.full_name || '—'}</td>
                  <td style={{ fontSize:13 }}>{u.email || '—'}</td>
                  <td><span className="badge badge-blue">{u.customer_code || '—'}</span></td>
                  <td>
                    <span className={`badge ${u.role==='admin'?'badge-warn':u.role==='cajero'?'badge-blue':'badge-ok'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:'var(--text-sub)' }}>
                    {new Date(u.created_at).toLocaleDateString('es')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Sidebar / Layout ───────────────────────────────────────────
const Sidebar: React.FC<{ adminName: string; onSignOut: () => void }> = ({ adminName, onSignOut }) => (
  <nav className="sidebar">
    <div className="sidebar-logo">🍜 HarryWOK<br /><span style={{ fontSize:11, opacity:.7 }}>Panel Admin</span></div>
    <div className="sidebar-nav">
      <NavLink to="/"          end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>📊 Dashboard</NavLink>
      <NavLink to="/menu"          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>🍽️ Menú</NavLink>
      <NavLink to="/campaigns"     className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>📣 Campañas</NavLink>
      <NavLink to="/users"         className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>👥 Usuarios</NavLink>
    </div>
    <div style={{ padding:'16px 20px', borderTop:'1px solid #333', fontSize:13 }}>
      <p style={{ opacity:.7, marginBottom:8 }}>👤 {adminName}</p>
      <button className="btn btn-ghost" style={{ color:'#fff', borderColor:'#555', width:'100%' }} onClick={onSignOut}>
        Cerrar sesión
      </button>
    </div>
  </nav>
);

// ── App raíz ───────────────────────────────────────────────────
export function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [adminName, setAdminName] = useState('Admin');
  const [ready, setReady]     = useState(false);

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
    const { data } = await supabase.from('profiles').select('full_name').eq('id', uid).single();
    if (data?.full_name) setAdminName(data.full_name);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); setSession(null); };

  if (!ready) return <div style={{ textAlign:'center', padding:60 }}>Cargando...</div>;
  if (!session) return <LoginPage onLogin={s => setSession(s)} />;

  return (
    <BrowserRouter>
      <div className="layout">
        <Sidebar adminName={adminName} onSignOut={handleSignOut} />
        <div className="content">
          <Routes>
            <Route path="/"           element={<DashboardPage />} />
            <Route path="/menu"       element={<MenuPage />} />
            <Route path="/campaigns"  element={<CampaignsPage />} />
            <Route path="/users"      element={<UsersPage />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default AdminApp;