import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { translations } from '../translations';
import type { PropertySettings, AccessControl, Language } from '../types';

interface GuestLoginProps {
  property?: PropertySettings;
  onLoginSuccess: (property: PropertySettings, guest: AccessControl) => void;
  language: Language;
  onToggleLanguage: () => void;
  onExit: () => void;
  onHostAccess: () => void; // Nueva prop para vincular el acceso de anfitrión
}

const GuestLogin: React.FC<GuestLoginProps> = ({
  property,
  onLoginSuccess, 
  language, 
  onToggleLanguage, 
  onExit,
  onHostAccess 
}) => {
  const t = translations[language];
  const [bookingCode, setBookingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = bookingCode.trim().toUpperCase();
    if (!cleanCode) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: guestData, error: guestError } = await supabase
        .from('access_control')
        .select('*')
        .eq('booking_code', cleanCode)
        .maybeSingle();

      if (guestError) throw guestError;
      
      if (!guestData) {
        setError(language === 'es' ? 'Código no encontrado' : 'Code not found');
        setIsLoading(false);
        return;
      }

      const { data: propData, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', guestData.property_id)
        .maybeSingle();

      if (propError || !propData) throw new Error('Property error');

      const formattedProperty: PropertySettings = {
        id: propData.id,
        ownerId: propData.owner_id,
        buildingName: propData.building_name,
        hostName: propData.host_name,
        city: propData.city,
        address: propData.address,
        capacity: propData.capacity,
        rooms: propData.rooms,
        bathrooms: propData.bathrooms,
        wifiSSID: propData.wifi_ssid,
        wifiPass: propData.wifi_pass,
        rules: propData.rules,
        guides: propData.guides,
        checkoutInstructions: propData.checkout_instructions,
        whatsappContact: propData.whatsapp_contact,
        welcomeImageUrl: propData.welcome_image_url,
        stayImageUrl: propData.stay_image_url,
        location_lat: propData.location_lat,
        location_lng: propData.location_lng,
        aiRecommendations: propData.ai_recommendations
      };

      const formattedGuest: AccessControl = {
        id: guestData.id,
        propertyId: guestData.property_id,
        guestName: guestData.guest_name,
        checkIn: guestData.check_in,
        checkOut: guestData.check_out,
        bookingCode: guestData.booking_code,
        doorCode: guestData.door_code,
        checkinStatus: guestData.checkin_status,
        registrationDate: guestData.registration_date,
        issuedAt: guestData.issued_at,
        doorCodeDuration: guestData.door_code_duration || undefined // ✅ AGREGADO
      };

      onLoginSuccess(formattedProperty, formattedGuest);

    } catch (err) {
      console.error("Login error:", err);
      setError(language === 'es' ? 'Error de conexión' : 'Connection error');
    } finally {
    }
  };

      // Reemplaza el bloque de botones superiores y el final del archivo en GuestLogin.tsx

   return (
      <div className="relative min-h-[calc(100vh-68px)] w-full flex flex-col items-center justify-center overflow-hidden bg-slate-900">
        
        {/* 🖼️ CAPA 1: IMAGEN DE FONDO DINÁMICA (Ocupa todo el espacio bajo la barra) */}
        <div className="absolute inset-0 z-0">
          <img 
            src={property?.stayImageUrl || "https://unsplash.com/photos/modern-luxury-house-with-swimming-pool-and-lush-green-landscaping-7s8ab4twHcI"} 
            className="w-full h-full object-cover transition-all duration-1000"
            alt="Welcome Background"
          />
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"></div>
        </div>

        {/* 🟢 CAPA 2: BOTONES DE NAVEGACIÓN (Debajo de la barra blanca) */}
        <div className="absolute top-6 inset-x-6 flex justify-between items-center z-50">
          <button 
            onClick={onExit}
            className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white/30 transition-all shadow-lg active:scale-95"
          >
            {language === 'es' ? 'SALIR' : 'EXIT'}
          </button>

          <button 
            onClick={onToggleLanguage}
            className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white/30 transition-all shadow-lg active:scale-95"
          >
            {language.toUpperCase()}
          </button>
        </div>

        {/* 📦 CAPA 3: TARJETA DE BIENVENIDA (Centrada y Luxury) */}
        <div className="relative z-10 w-full flex flex-col items-center px-6">
          <div className="bg-white w-full max-w-[360px] rounded-[3.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.4)] p-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6 text-emerald-500 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
                  <path fillRule="evenodd" d="M15.75 1.5a6.75 6.75 0 00-6.651 7.906c-1.067.322-2.024.854-2.841 1.538l-1.634-1.633a2.25 2.25 0 00-3.182 3.182l1.633 1.634a.75.75 0 01.22.53v1.5c0 .414.336.75.75.75h1.5a.75.75 0 01.53.22l2.484-2.485c.684-.817 1.216-1.774 1.538-2.841A6.75 6.75 0 1015.75 1.5zm0 3a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5zm-3 2.25a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">
                {language === 'es' ? 'Bienvenido' : 'Welcome'}
              </h1>
              <p className="text-slate-400 text-[11px] font-bold tracking-tight">
                {language === 'es' ? 'Ingresa tu código de reserva.' : 'Enter your booking code.'}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3 text-center">
                <label className="block text-[9px] font-black text-slate-300 tracking-[0.25em] uppercase">
                  {language === 'es' ? 'CÓDIGO DE RESERVA' : 'BOOKING CODE'}
                </label>
                <input
                  type="text"
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value)}
                  placeholder="GUEST77"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 text-slate-900 text-2xl text-center font-black uppercase tracking-[0.2em] focus:bg-white focus:border-[#0052FF] outline-none transition-all duration-300 placeholder-slate-200"
                />
                {error && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-4 animate-pulse">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-[#111111] hover:bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-[0.97] shadow-xl ${
                  isLoading ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                {isLoading ? '...' : (language === 'es' ? 'ACCEDER A MI ESTANCIA' : 'ACCESS MY STAY')}
              </button>
            </form>
          </div>

          <div className="relative z-10 w-full flex flex-col items-center px-6"></div>
          
          {/* Acceso Anfitrión (Discreto al pie) */}
          <button onClick={onHostAccess} className="mt-8 text-[9px] font-black text-white/40 uppercase tracking-[0.3em] hover:text-white transition-colors">
            {t.auth.hostAccessBtn}
          </button>
        </div>
      </div>
    );
};

export default GuestLogin;