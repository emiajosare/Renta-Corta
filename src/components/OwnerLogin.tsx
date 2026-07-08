import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface OwnerLoginProps {
  onLoginSuccess: (ownerData: any) => void;
  onBack: () => void;
  defaultEmail?: string;
}



export default function OwnerLogin({ onLoginSuccess, onBack, defaultEmail = '' }: OwnerLoginProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);

      try {
        // Login con Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        });

        if (authError) throw new Error('Credenciales inválidas.');

        // Cargamos el perfil
        const { data: ownerData, error: ownerError } = await supabase
          .from('owners')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (ownerError || !ownerData) throw new Error('Perfil no encontrado.');

        onLoginSuccess(ownerData);

      } catch (err: any) {
        setError(err.message || 'Error de conexión');
      } finally {
        setIsLoading(false);
      }
    };

    const handleForgotPassword = async () => {
      if (!email) {
        setError('Ingresa tu email primero.');
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?action=reset-password`,
      });
      if (error) {
        setError('Error al enviar el correo.');
      } else {
        setResetSent(true);
      }
    };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] p-4 relative z-50">
      
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-[#0052FF] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-[#212121] tracking-tight">Acceso Anfitrión</h2>
          <p className="text-[#64748B] mt-3 font-medium">Ingrese a su panel de control.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-[#64748B] tracking-[0.15em] mb-2 ml-1">Email de Administrador</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] focus:bg-white focus:border-[#0052FF] outline-none transition-all duration-300"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-[#64748B] tracking-[0.15em] mb-2 ml-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] focus:bg-white focus:border-[#0052FF] outline-none transition-all duration-300 font-mono"
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
            disabled={isLoading}
            className="w-full bg-[#0052FF] hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-100 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? 'VALIDANDO...' : 'VALIDAR ACCESO'}
          </button>
        </form>

        {resetSent ? (
        <div className="text-center p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100">
          ✅ Revisa tu correo — te enviamos el enlace de recuperación.
        </div>
        ) : (
          <button
            type="button"
            onClick={handleForgotPassword}
            className="w-full text-[10px] font-black text-slate-300 hover:text-[#0052FF] uppercase tracking-[0.2em] transition-colors py-2"
          >
            Olvidé mi contraseña
          </button>
        )}
                
        <div className="mt-6 flex justify-center">
          <button 
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] transition-colors py-2 px-4"
          >
            REGRESAR
          </button>
        </div>
      </div>
    </div>
  );
}