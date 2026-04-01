import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface LandingPageProps {
  onLoginSuccess: (ownerData: any) => void;
}

// 1. LOGO NATIVO
const Logo = ({ imageClass = "w-10 h-10", showText = true, containerClass = "flex items-center gap-3" }) => (
  <div className={containerClass}>
    <img 
      src="/logo.png" 
      alt="HostFlow Logo" 
      className={`${imageClass} object-contain`}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
    {showText && <span className="text-xl font-bold tracking-tighter text-white">Host<span className="text-[#C9A84C]">Flow</span></span>}
  </div>
);


// 2. MODAL DE AUTENTICACIÓN (CONECTADO A SUPABASE REAL)
const AuthModal = ({ isOpen, onClose, onLoginSuccess }: { isOpen: boolean; onClose: () => void; onLoginSuccess: (user: any) => void }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        // LÓGICA DE LOGIN REAL
        const { data, error } = await supabase
          .from('owners')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .eq('master_pin', password)
          .maybeSingle();

        if (error || !data) throw new Error('Credenciales inválidas o cuenta no encontrada.');
        
        setMessage({ type: 'success', text: '¡Acceso concedido!' });
        setTimeout(() => onLoginSuccess(data), 1000);

      } else {
        // LÓGICA DE REGISTRO (ESCASEZ REAL: MAX 20 CUPOS)
        const { count } = await supabase.from('owners').select('*', { count: 'exact', head: true });
        if (count && count >= 20) throw new Error('Los 20 cupos fundadores se han agotado.');

        // Verificamos si el email ya existe
        const { data: existingUser } = await supabase.from('owners').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
        if (existingUser) throw new Error('Este correo ya está registrado. Inicia sesión.');

        // Creamos el usuario
        const newToken = `LUX-${Math.random().toString(36).toUpperCase().substring(2, 6)}`;
        const { data, error } = await supabase.from('owners').insert([{
          name: email.split('@')[0], // Nombre temporal basado en el email
          email: email.toLowerCase().trim(),
          master_pin: password, // Usamos la contraseña como su PIN maestro
          token: newToken,
          is_first_login: true,
          role: 'owner'
        }]).select().single();

        if (error) throw error;

        setMessage({ type: 'success', text: '¡Cupo reclamado con éxito!' });
        setTimeout(() => onLoginSuccess(data), 1500);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al conectar con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md p-8 rounded-[2.5rem] bg-[#111] border border-[#C9A84C]/30 shadow-[0_0_50px_rgba(201,168,76,0.15)] animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="text-center mb-8">
          <Logo showText={false} imageClass="w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(201,168,76,0.3)]" containerClass="flex justify-center" />
          <h2 className="text-2xl font-bold mb-2 text-white">{isLogin ? 'Accede a tu cuenta' : 'Reclama tu Cupo Fundador'}</h2>
          <p className="text-sm text-white/50">{isLogin ? 'Gestiona tus propiedades.' : 'Quedan pocos cupos gratuitos disponibles.'}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ejemplo@hostflow.com" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm text-white focus:border-[#C9A84C]/50 focus:outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">{isLogin ? 'Contraseña / PIN' : 'Crea una Contraseña'}</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm text-white focus:border-[#C9A84C]/50 focus:outline-none transition-all" />
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-xs font-medium ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              {message.text}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-4 bg-[#C9A84C] text-black font-black rounded-full hover:bg-[#b5953f] transition-all flex items-center justify-center shadow-[0_10px_20px_rgba(201,168,76,0.15)] disabled:opacity-50">
            {loading ? 'Procesando...' : (isLogin ? 'Entrar al Panel' : 'Asegurar mi cuenta gratis')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-xs text-white/40 hover:text-[#C9A84C] transition-colors font-medium">
            {isLogin ? '¿No tienes cuenta? Reclama tu cupo gratis' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 3. LA LANDING PAGE PRINCIPAL
export default function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [showAuth, setShowAuth] = useState(false);

  // 🟢 AUTO-ABRIR MODAL SI VIENE DE MARKETING
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'signup') {
      setShowAuth(true); // Abre el modal mágicamente
      
      // Limpiamos la URL para que quede bonita y profesional (opcional pero recomendado)
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-[#C9A84C] selection:text-black font-sans scroll-smooth">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <Logo imageClass="w-12 h-12" />
        <button onClick={() => setShowAuth(true)} className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-[#C9A84C] transition-all">
          Reclamar Cupo
        </button>
      </nav>
      
      <main>
        <section className="relative pt-32 pb-20 px-6 overflow-hidden min-h-[90vh] flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl -z-10 opacity-20">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C9A84C]/30 rounded-full blur-[120px]" />
          </div>
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 mb-8 text-xs font-bold tracking-widest uppercase text-rose-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path></svg>
              Sólo quedan 6 de 20 cupos fundadores
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1] text-white">
              Deja de responder las mismas preguntas <span className="text-[#C9A84C] italic font-serif">todos los días.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto">
              Automatiza check-in, WiFi, reglas y guías en un solo enlace profesional para tus huéspedes.
            </p>
            <button onClick={() => setShowAuth(true)} className="w-full sm:w-auto px-10 py-5 bg-[#C9A84C] text-black font-black rounded-full mx-auto flex items-center justify-center hover:bg-[#b5953f] hover:scale-105 transition-all shadow-[0_0_30px_rgba(201,168,76,0.3)]">
              RECLAMAR CUPO GRATUITO
            </button>
          </div>
        </section>

        <section className="py-24 px-6 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6 text-white">Planes diseñados para <span className="text-[#C9A84C]">crecer.</span></h2>
            </div>
            <div className="grid md:grid-cols-1 max-w-md mx-auto items-center">
              <div className="relative p-10 rounded-[3rem] border bg-white/5 border-[#C9A84C] shadow-[0_0_50px_rgba(201,168,76,0.1)] scale-105 z-10 text-center">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-rose-500 text-white text-[10px] font-black rounded-full uppercase tracking-tighter">
                  Quedan 6 Cupos
                </span>
                <h3 className="text-2xl font-bold mb-2 text-white">Plan Fundador</h3>
                <div className="flex items-baseline justify-center gap-1 mb-8">
                  <span className="text-5xl font-bold text-white">$0</span>
                  <span className="text-white/40 text-sm">/ de por vida</span>
                </div>
                <button onClick={() => setShowAuth(true)} className="w-full py-4 bg-[#C9A84C] text-black rounded-full font-bold transition-all hover:bg-[#b5953f]">
                  Reclamar Cupo Gratis
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 border-t border-white/10 text-center opacity-40 hover:opacity-100 transition-opacity">
        <Logo showText={false} imageClass="w-8 h-8 opacity-50 grayscale hover:grayscale-0 transition-all mx-auto mb-4" containerClass="flex justify-center" />
        <p className="text-xs tracking-widest uppercase font-bold">&copy; 2025 HostFlow • El estándar de oro en gestión de rentas</p>
      </footer>
      
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onLoginSuccess={onLoginSuccess} />
    </div>
  );
}