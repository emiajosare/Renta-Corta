
import React, { useState } from 'react';

interface OwnerLoginProps {
  onLogin: (token: string) => void;
  onBack: () => void;
  error?: string;
  t: any;
}

const OwnerLogin: React.FC<OwnerLoginProps> = ({ onLogin, onBack, error, t }) => {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(token);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-[#212121] tracking-tight">{t.auth.ownerAccess}</h2>
          <p className="text-[#64748B] mt-3 font-medium">{t.auth.ownerSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase text-[#64748B] tracking-[0.15em] mb-2 ml-1">{t.auth.tokenLabel}</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ADMIN2024"
              className="w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] placeholder-[#64748B] focus:bg-white focus:border-[#0052FF] focus:ring-4 focus:ring-[#0052FF]/15 outline-none transition-all duration-300 font-mono"
              required
            />
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-[#0052FF] hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
          >
            {t.auth.validate}
          </button>
        </form>
        
        <div className="mt-6 flex justify-center">
            <button 
                onClick={onBack}
                className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] transition-colors py-2 px-4"
            >
                {t.common.back}
            </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-50 text-center">
          <p className="text-[9px] font-black text-slate-300 tracking-[0.2em] uppercase">Suite de Gestión v1.3</p>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
