
import React, { useState } from 'react';
import type { Owner } from '../types';

interface InitialSecurityConfigProps {
  owner: Owner;
  onUpdateToken: (newToken: string) => void;
}

const InitialSecurityConfig: React.FC<InitialSecurityConfigProps> = ({ onUpdateToken }) => {
  const [newToken, setNewToken] = useState('');
  const [confirmToken, setConfirmToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newToken.length < 6) {
      setError('El token debe tener al menos 6 caracteres.');
      return;
    }
    if (newToken !== confirmToken) {
      setError('Los tokens no coinciden.');
      return;
    }
    onUpdateToken(newToken);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 w-full max-w-lg">
        <div className="mb-10 text-center">
          <div className="w-24 h-24 bg-blue-50 text-[#0052FF] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-[#212121] tracking-tight">Seguridad Inicial</h2>
          <p className="text-[#64748B] mt-3 font-medium">Personalice su token antes de continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase text-[#64748B] tracking-[0.15em] mb-2 ml-1">Nuevo Token Personalizado</label>
            <input
              type="password"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              placeholder="Min. 6 caracteres"
              className="w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] placeholder-[#64748B] focus:bg-white focus:border-[#0052FF] focus:ring-4 focus:ring-[#0052FF]/15 outline-none transition-all duration-300 font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-[#64748B] tracking-[0.15em] mb-2 ml-1">Confirmar Nuevo Token</label>
            <input
              type="password"
              value={confirmToken}
              onChange={(e) => setConfirmToken(e.target.value)}
              placeholder="Repita su token"
              className="w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] placeholder-[#64748B] focus:bg-white focus:border-[#0052FF] focus:ring-4 focus:ring-[#0052FF]/15 outline-none transition-all duration-300 font-mono"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#0052FF] hover:bg-blue-700 text-white font-black py-6 rounded-2xl transition-all shadow-2xl shadow-blue-100 active:scale-[0.97]"
          >
            ACTUALIZAR Y REINICIAR
          </button>
        </form>
      </div>
    </div>
  );
};

export default InitialSecurityConfig;
