import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Owner } from '../types';

// Al principio de SuperAdminPanel.tsx cambia la interfaz:
interface SuperAdminPanelProps {
  onLogout: () => void;
}

const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({ onLogout }) => {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    const { data } = await supabase.from('owners').select('*').order('created_at', { ascending: false });
    if (data) setOwners(data);
  };

  // --- FUNCIÓN PARA GENERAR TOKEN ---
    const generateInviteToken = async () => {
    if (!newOwnerName.trim()) return;
    setIsLoading(true);
    
    const newToken = `LUX-${Math.random().toString(36).toUpperCase().substring(2, 6)}`;
    
    try {
        const { error } = await supabase.from('owners').insert([
        { 
            name: newOwnerName.trim(), 
            token: newToken, 
            is_first_login: true,
            role: 'owner' 
        }
        ]);

        if (error) throw error;

        setNewOwnerName('');
        await fetchOwners();
        // Lanzamos el alert después de un pequeño respiro para que React actualice la UI
        setTimeout(() => alert(`¡Invitación Creada! Token: ${newToken}`), 100);

    } catch (err) {
        console.error(err);
        alert('Error al crear la invitación.');
    } finally {
        // 🟢 ESTO ASEGURA QUE EL BOTÓN VUELVA A LA NORMALIDAD SIEMPRE
        setIsLoading(false);
    }
    };

    // --- 🟢 NUEVA FUNCIÓN PARA BORRAR (ACCIONES) ---
    const handleDeleteOwner = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`¿Estás seguro de eliminar a ${name}? Esto borrará también sus propiedades.`);
    
    if (confirmDelete) {
        try {
        const { error } = await supabase
            .from('owners')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        // Refrescamos la lista automáticamente
        setOwners(owners.filter(o => o.id !== id));
        } catch (err) {
        alert('No se pudo eliminar al administrador.');
        }
    }
    };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-700">
      <header className="mb-12 flex justify-between items-start">
        <div>
            <span className="text-emerald-500 text-[10px] font-black tracking-[0.4em] uppercase">Control Central</span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Super Admin</h2>
        </div>
        
        {/* 🟢 BOTÓN DE SALIDA ESMERALDA */}
        <button 
            onClick={onLogout}
            className="bg-white text-slate-900 px-6 py-3 rounded-full border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95"
        >
            Cerrar Sesión
        </button>
    </header>

      {/* GENERADOR DE TOKENS */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-emerald-50 mb-10 flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1">
          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-2">Nombre del Nuevo Anfitrión</label>
          <input 
            type="text" 
            value={newOwnerName}
            onChange={(e) => setNewOwnerName(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
            placeholder="Ej: David Eraso"
          />
        </div>
        <button 
          onClick={generateInviteToken}
          disabled={isLoading}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95"
        >
          {isLoading ? 'GENERANDO...' : 'CREAR TOKEN DE INVITACIÓN'}
        </button>
      </div>

      {/* LISTA DE ADMINISTRADORES */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Anfitrión</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Token / Email</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {owners.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6 font-bold text-slate-700">{o.name}</td>
                <td className="px-8 py-6">
                  <span className="text-xs font-mono text-slate-400">{o.email || o.token}</span>
                </td>
                <td className="px-8 py-6">
                  {o.is_first_login ? (
                    <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">Pendiente</span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">Activo</span>
                  )}
                </td>
                 <td className="px-8 py-6 text-right">
                    <button 
                        onClick={() => handleDeleteOwner(o.id, o.name)} // 🟢 Conexión aquí
                        className="text-slate-300 hover:text-rose-500 transition-colors p-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminPanel;