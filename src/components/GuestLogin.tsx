
import React, { useState } from 'react';

interface GuestLoginProps {
  onLogin: (code: string) => void;
  error?: string;
  t: any;
}

const GuestLogin: React.FC<GuestLoginProps> = ({ onLogin, error, t }) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(code);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 w-full max-w-md">
        
        <div className="mb-10 text-center">
          <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-[#212121] tracking-tight">{t.auth.welcome}</h2>
          <p className="text-[#64748B] mt-3 font-medium">{t.auth.guestSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] mb-3 ml-1">{t.auth.guestLabel}</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GUEST777"
              className="w-full px-6 py-5 text-center text-3xl font-black font-mono tracking-[0.3em] rounded-[1.5rem] border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] placeholder-[#CBD5E1] focus:bg-white focus:border-[#0052FF] focus:ring-4 focus:ring-[#0052FF]/15 outline-none transition-all duration-300 uppercase"
              required
            />
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-sm font-bold border border-red-100 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-[#212121] hover:bg-black text-white font-black py-6 rounded-[1.5rem] transition-all shadow-2xl active:scale-[0.98] text-lg"
          >
            {t.auth.accessStay}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GuestLogin;
