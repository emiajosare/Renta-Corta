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
      setIsLoading(false);
    }
  };

      // Reemplaza el bloque de botones superiores y el final del archivo en GuestLogin.tsx

    return (
  <div className="relative min-h-screen w-full flex items-center justify-center bg-[#080808]">
    
    {/* 🖼️ CAPA 1: FONDO UNIFICADO (Sin cortes) */}
    <div className="absolute inset-0 z-0">
      <img 
        src={property?.welcomeImageUrl || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=80"} 
        className="w-full h-full object-cover opacity-50"
        alt="Welcome"
      />
      {/* Degradado para dar profundidad y que el texto resalte */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
    </div>

    {/* 🟢 CAPA 2: BOTONES DE CONTROL (Visibles y elegantes) */}
    <div className="absolute top-8 inset-x-8 flex justify-between items-center z-50">
      <button 
        onClick={onExit}
        className="px-6 py-2.5 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all active:scale-95"
      >
        {language === 'es' ? '← SALIR' : '← EXIT'}
      </button>

      <button 
        onClick={onToggleLanguage}
        className="px-6 py-2.5 bg-white/10 backdrop-blur-xl border border-white/20 text-[#C9A84C] rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all shadow-lg"
      >
        {language.toUpperCase()}
      </button>
    </div>

    {/* 📦 CAPA 3: TARJETA Y BIENVENIDA */}
    <div className="relative z-10 w-full max-w-[380px] px-6 flex flex-col items-center">
      
      {/* Título de la Propiedad (Solo si hay link activo) */}
      <div className="text-center mb-10 animate-in fade-in slide-in-from-top-6 duration-1000">
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2 drop-shadow-2xl">
          {property?.buildingName || (language === 'es' ? 'BIENVENIDO' : 'WELCOME')}
        </h1>
        <div className="h-[2px] w-12 bg-[#C9A84C] mx-auto rounded-full mb-3 shadow-[0_0_10px_#C9A84C]" />
        <p className="text-[#C9A84C] font-bold tracking-[0.4em] text-[9px] uppercase opacity-80">
          Concierge Digital
        </p>
      </div>

      {/* Tarjeta de Acceso */}
      <div className="bg-white rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] p-10 w-full">
        <form onSubmit={handleLogin} className="space-y-8">
          <div className="text-center space-y-4">
            <label className="block text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">
              {language === 'es' ? 'CÓDIGO DE ACCESO' : 'ACCESS CODE'}
            </label>
            <input
              type="text"
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
              placeholder="----"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 text-center text-3xl font-black tracking-[0.3em] text-slate-900 focus:border-[#C9A84C] focus:bg-white outline-none transition-all placeholder:text-slate-200"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isLoading ? '...' : (language === 'es' ? 'ENTRAR A MI ESTANCIA' : 'ENTER MY STAY')}
          </button>
        </form>
      </div>

      {/* Acceso Anfitrión (Discreto y elegante abajo) */}
      <button 
        onClick={onHostAccess}
        className="mt-12 text-[9px] font-black text-white/30 hover:text-[#C9A84C] uppercase tracking-[0.3em] transition-colors"
      >
        {language === 'es' ? 'Acceso Privado Anfitrión' : 'Host Private Access'}
      </button>
    </div>
  </div>
);

};

export default GuestLogin;