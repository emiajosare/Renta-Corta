import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { translations } from '../translations';
import type { PropertySettings, AccessControl, Language } from '../types';

interface GuestLoginProps {
  onLoginSuccess: (property: PropertySettings, guest: AccessControl) => void;
  language: Language;
  onToggleLanguage: () => void;
  onExit: () => void;
  onHostAccess: () => void; // Nueva prop para vincular el acceso de anfitrión
}

const GuestLogin: React.FC<GuestLoginProps> = ({ 
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
        location_lng: propData.location_lng
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
        issuedAt: guestData.issued_at
      };

      onLoginSuccess(formattedProperty, formattedGuest);

    } catch (err) {
      console.error("Login error:", err);
      setError(language === 'es' ? 'Error de conexión' : 'Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center pt-16 p-6 relative z-10">
      
      {/* 🟢 BOTONES SUPERIORES SIMÉTRICOS */}
      <div className="absolute top-0 inset-x-6 flex justify-between items-center z-50">
        {/* BOTÓN SALIR: Mismo estilo que el de idioma */}
        <button 
          onClick={onExit}
          className="bg-black/20 backdrop-blur-md border border-white/10 text-[10px] font-black text-white/70 hover:text-white uppercase tracking-[0.2em] px-4 py-2 rounded-full transition-all active:scale-95"
        >
          {language === 'es' ? 'SALIR' : 'EXIT'}
        </button>

        {/* BOTÓN IDIOMA: Controlado desde el componente padre */}
        <button 
          onClick={onToggleLanguage}
          className="bg-black/20 backdrop-blur-md border border-white/10 text-[10px] font-black text-white/70 hover:text-white uppercase tracking-[0.2em] px-4 py-2 rounded-full transition-all active:scale-95"
        >
          {language.toUpperCase()}
        </button>
      </div>

      {/* TARJETA DE BIENVENIDA */}
      <div className="relative bg-white w-full max-w-[360px] rounded-[3.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] p-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 text-emerald-500 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
              <path fillRule="evenodd" d="M15.75 1.5a6.75 6.75 0 00-6.651 7.906c-1.067.322-2.024.854-2.841 1.538l-1.634-1.633a2.25 2.25 0 00-3.182 3.182l1.633 1.634a.75.75 0 01.22.53v1.5c0 .414.336.75.75.75h1.5a.75.75 0 01.53.22l2.484-2.485c.684-.817 1.216-1.774 1.538-2.841A6.75 6.75 0 1015.75 1.5zm0 3a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5zm-3 2.25a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
            {language === 'es' ? 'Bienvenido' : 'Welcome'}
          </h1>
          <p className="text-gray-400 text-sm font-semibold">
            {language === 'es' ? 'Ingresa tu código de reserva.' : 'Enter your booking code.'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-3 text-center">
            <label className="block text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">
              {language === 'es' ? 'CÓDIGO DE RESERVA' : 'BOOKING CODE'}
            </label>
            <input
              type="text"
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value)}
              placeholder="GUEST77"
              className="w-full px-6 py-5 rounded-2xl bg-gray-50 border-2 border-gray-100 text-gray-900 text-2xl text-center font-black uppercase tracking-[0.2em] focus:bg-white focus:border-emerald-500 outline-none transition-all duration-300 placeholder-gray-200"
            />
            {error && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-4 animate-pulse">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-[#111111] hover:bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.25em] transition-all active:scale-[0.97] shadow-xl ${
              isLoading ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            {isLoading ? (language === 'es' ? 'VERIFICANDO...' : 'CHECKING...') : (language === 'es' ? 'ACCEDER A MI ESTANCIA' : 'ACCESS MY STAY')}
          </button>
        </form>

        {/* ACCESO ANFITRIÓN INTERNO: Ahora funcional */}
        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <button 
            onClick={onHostAccess}
            className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-gray-600 transition-colors"
          >
            {language === 'es' ? 'ACCESO ANFITRIÓN' : 'HOST ACCESS'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestLogin;