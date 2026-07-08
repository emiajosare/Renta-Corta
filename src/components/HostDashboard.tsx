import React, { useState } from 'react';
import ImageUploader from './ImageUploader';

// Definición local de Logo para evitar errores de IntrinsicAttributes
const Logo = ({ imageClass = "w-10 h-10", showText = true, containerClass = "flex items-center gap-3" }) => (
  <div className={containerClass}>
    <img src="/logo.png" alt="Logo" className={`${imageClass} object-contain`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    {showText && <span className="text-xl font-bold tracking-tighter text-white">Host<span className="text-[#C9A84C]">Flow</span></span>}
  </div>
);

export default function HostDashboard({ user, onLogout, onStartCreating }: any) {
  const [setupData, setSetupData] = useState({
    propName: "",
    city: "",
    address: "",
    bgImage: "" 
  });

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans">
      {/* NAVBAR SUPERIOR */}
      <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <Logo showText={true} />
        <button onClick={onLogout} className="text-[10px] font-black tracking-widest text-white/40 hover:text-red-500 transition-colors uppercase">
          CERRAR SESIÓN
        </button>
      </nav>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)] overflow-hidden">
        
        {/* PANEL IZQUIERDO: SIMULADOR REFINADO */}
        <div className="hidden lg:flex w-1/2 bg-black items-center justify-center p-8 border-r border-white/5">
          <div className="relative w-[320px] h-[640px] bg-[#111] rounded-[2rem] border-[8px] border-[#1a1a1a] shadow-2xl overflow-hidden flex flex-col">
            
            {/* Imagen de Fondo Dinámica */}
            <div className="absolute inset-0 z-0">
              {setupData.bgImage ? (
                <img src={setupData.bgImage} className="w-full h-full object-cover animate-in fade-in duration-700" alt="Property Background" />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white/5 text-[10px] italic">Sube la imagen exterior</div>
              )}
              <div className="absolute inset-0 bg-black/20" />
            </div>

            {/* INTERFAZ DEL HUÉSPED */}
            <div className="relative z-10 flex-1 flex flex-col">
              
              {/* Cabecera Blanca: Nombre Alineado a la Izquierda */}
              <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 w-full flex items-center h-16 shadow-sm">
                <h4 className="text-slate-900 font-black uppercase tracking-[0.15em] text-[11px] truncate animate-in slide-in-from-left-2 duration-300">
                  {setupData.propName || "HOSTFLOW"}
                </h4>
              </div>

              {/* Botones de Navegación Lateral (Salir e Idioma) */}
              <div className="absolute top-20 left-0 right-0 px-4 flex justify-between items-center z-20">
                <div className="bg-white/20 backdrop-blur-md border border-white/30 px-4 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-widest cursor-default">
                  SALIR
                </div>
                <div className="bg-white/20 backdrop-blur-md border border-white/30 px-4 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-widest cursor-default">
                  ES
                </div>
              </div>

              {/* Contenedor de Tarjeta Central */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 mt-4">
                
                {/* Tarjeta de Bienvenida */}
                <div className="bg-white/95 backdrop-blur-md w-full rounded-[2.5rem] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-500">
                  
                  {/* Icono de Llave Verde */}
                  <div className="w-14 h-14 bg-[#E8F5E9] rounded-full mx-auto mb-6 flex items-center justify-center shadow-inner">
                    <svg className="w-7 h-7 text-[#4CAF50]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                    </svg>
                  </div>

                  <h3 className="text-3xl font-black text-[#1a1a1a] mb-1 leading-tight tracking-tighter uppercase italic">
                    Bienvenido
                  </h3>
                  
                  {/* Subtexto Ajustado (No supera el ancho de Bienvenido) */}
                  <p className="text-slate-400 text-[9px] mb-8 font-bold uppercase tracking-widest max-w-[120px] mx-auto leading-relaxed">
                    Ingresa tu código de reserva.
                  </p>
                  
                  <div className="space-y-4">
                    {/* Código de Reserva: Etiqueta Centrada */}
                    <div className="text-center">
                      <label className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2 block">código de reserva</label>
                      <div className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 text-center text-slate-300 font-black tracking-[0.3em] text-sm">
                        GUEST77
                      </div>
                    </div>
                    
                    <button className="w-full py-4 bg-[#111] text-white text-[9px] font-black rounded-2xl uppercase tracking-[0.2em]">
                      ACCEDER A MI ESTANCIA
                    </button>
                  </div>
                </div>
                
                {/* Texto Acceso Anfitrión */}
                <button className="mt-8 text-[9px] font-black text-white/40 uppercase tracking-[0.2em] border-b border-white/10 pb-1">
                  ACCESO ANFITRIÓN
                </button>
              </div>

              {/* Barra inferior */}
              <div className="h-10 bg-black flex items-center justify-center">
                 <div className="w-1/3 h-1 bg-white/10 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: FORMULARIO */}
        <div className="w-full lg:w-1/2 p-8 lg:p-16 overflow-y-auto flex items-center">
          <div className="max-w-md mx-auto w-full">
            <h2 className="text-4xl font-black mb-2 italic">Estándar de Oro.</h2>
            <p className="text-white/40 mb-10 text-sm">Define la identidad visual de tu propiedad.</p>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-[#C9A84C] uppercase mb-2 tracking-widest">Nombre de la Propiedad</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:border-[#C9A84C] outline-none transition-all placeholder:text-white/5"
                  placeholder="Ej: Delventto Suits"
                  onChange={(e) => setSetupData({...setupData, propName: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-[#C9A84C] uppercase mb-2 tracking-widest">Ciudad</label>
                  <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:border-[#C9A84C] outline-none" placeholder="Ciudad" onChange={(e) => setSetupData({...setupData, city: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#C9A84C] uppercase mb-2 tracking-widest">Dirección</label>
                  <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:border-[#C9A84C] outline-none" placeholder="Dirección" onChange={(e) => setSetupData({...setupData, address: e.target.value})} />
                </div>
              </div>

              <ImageUploader 
                label="Imagen Exterior (Fondo)"
                currentUrl={setupData.bgImage}
                contextName={`setup-${user?.id}`}
                onUploadSuccess={(url) => setSetupData({...setupData, bgImage: url})}
                onDelete={() => setSetupData({...setupData, bgImage: ""})}
              />

              <div className="pt-6">
                <button 
                  onClick={() => onStartCreating(setupData)} 
                  className="w-full py-5 bg-[#C9A84C] text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg uppercase tracking-widest"
                >
                  FINALIZAR Y VER PANEL COMPLETO
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}