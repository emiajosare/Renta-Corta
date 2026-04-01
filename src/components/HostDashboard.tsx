import React from 'react';

interface HostDashboardProps {
  user: any;
  onLogout: () => void;
  onStartCreating: () => void; // 🟢 Conecta directamente con tu App.tsx
}

const Logo = ({ imageClass = "w-10 h-10", showText = true, containerClass = "flex items-center gap-3" }) => (
  <div className={containerClass}>
    <img src="/logo.png" alt="HostFlow Logo" className={`${imageClass} object-contain`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    {showText && <span className="text-xl font-bold tracking-tighter text-white">Host<span className="text-[#C9A84C]">Flow</span></span>}
  </div>
);

export default function HostDashboard({ user, onLogout, onStartCreating }: HostDashboardProps) {
  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans selection:bg-[#C9A84C] selection:text-black">
      <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <Logo showText={true} imageClass="w-10 h-10" />
        <div className="flex items-center gap-6">
          <div className="hidden md:block text-sm text-white/60">
            <span className="text-white/40">Hola,</span> {user?.email || 'Fundador'}
          </div>
          <button onClick={onLogout} className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] text-xs font-bold uppercase tracking-widest mb-4">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Cuenta Fundador Activa
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Bienvenido a tu libertad.</h1>
          <p className="text-white/50 text-lg">Estás a un paso de automatizar la comunicación con tus huéspedes.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center bg-white/[0.02] border border-white/10 p-8 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#C9A84C]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group bg-black shadow-lg">
            <iframe className="w-full h-full relative z-10" src="https://www.youtube.com/embed/f0mAyui2rdc?rel=0&modestbranding=1" title="Video" frameBorder="0" allowFullScreen />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-4 text-white">1. Mira el tutorial de 2 minutos</h2>
            <p className="text-white/60 mb-8 leading-relaxed">Te explicamos exactamente cómo cargar las fotos de tu propiedad y generar tu enlace mágico.</p>
            <button 
              onClick={onStartCreating} // 🟢 Llama a la función de App.tsx
              className="w-full py-5 bg-[#C9A84C] text-black font-black text-lg rounded-full hover:bg-[#b5953f] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              CREAR MI PRIMERA PROPIEDAD
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}