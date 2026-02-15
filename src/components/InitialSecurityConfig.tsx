
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Owner } from '../types';

interface InitialSecurityConfigProps {
  owner: Owner;
  onConfigSuccess: (updatedOwner: Owner) => void;
  language: 'es' | 'en';
}

const InitialSecurityConfig: React.FC<InitialSecurityConfigProps> = ({ owner, onConfigSuccess, language }) => {
  const [email, setEmail] = useState(owner.email || '');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (newPin.length < 6) {
      setError(language === 'es' ? 'El PIN debe tener al menos 6 caracteres.' : 'PIN must be at least 6 characters.');
      return;
    }
    if (newPin !== confirmPin) {
      setError(language === 'es' ? 'Los PIN no coinciden.' : 'PINs do not match.');
      return;
    }

    setIsLoading(true);
    try {
      // 🟢 ACTUALIZACIÓN CRUCIAL EN SUPABASE
          const { data, error: updateError } = await supabase
      .from('owners')
      .update({ 
        email: email.trim().toLowerCase(), 
        master_pin: newPin, 
        is_first_login: false 
      })
      .eq('id', owner.id) // 🎯 ¡ESTO ES LO MÁS IMPORTANTE! Solo actualiza su propia fila.
      .select()
      .single();
      
      if (updateError) throw updateError;

      onConfigSuccess(data);
    } catch (err) {
      console.error(err);
      setError(language === 'es' ? 'Error al guardar la configuración.' : 'Error saving configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 w-full max-w-lg animate-in fade-in zoom-in duration-500">
        <div className="mb-10 text-center">
          <div className="w-24 h-24 bg-blue-50 text-[#0052FF] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-[#212121] tracking-tight">
            {language === 'es' ? 'Seguridad Inicial' : 'Initial Security'}
          </h2>
          <p className="text-[#64748B] mt-3 font-medium">
            {language === 'es' ? 'Configure su acceso maestro y correo de recuperación.' : 'Set up your master access and recovery email.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CAMPO EMAIL */}
          <div>
            <label className="block text-[10px] font-black uppercase text-[#64748B] tracking-[0.15em] mb-2 ml-1">Email de Administración</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] placeholder-[#64748B] focus:bg-white focus:border-[#0052FF] focus:ring-4 focus:ring-[#0052FF]/15 outline-none transition-all duration-300"
              required
            />
          </div>

          {/* CAMPOS PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-[#64748B] tracking-[0.15em] mb-2 ml-1">Nuevo PIN Maestro</label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="******"
                className="w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] text-center font-mono focus:bg-white focus:border-[#0052FF] outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[#64748B] tracking-[0.15em] mb-2 ml-1">Confirmar PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="******"
                className="w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] text-center font-mono focus:bg-white focus:border-[#0052FF] outline-none transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-[#0052FF] hover:bg-blue-700 text-white font-black py-6 rounded-2xl transition-all shadow-2xl shadow-blue-100 active:scale-[0.97] ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading 
              ? (language === 'es' ? 'ACTUALIZANDO...' : 'UPDATING...') 
              : (language === 'es' ? 'ACTIVAR ACCESO MAESTRO' : 'ACTIVATE MASTER ACCESS')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InitialSecurityConfig;