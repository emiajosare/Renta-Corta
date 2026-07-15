import React, { useState, useEffect, useCallback } from 'react';
import { type Owner, type PropertySettings, type AccessControl, type Language, type OwnerRow, type NewPropertyInitialData } from './types';
import { AppView } from "./types";
import { STORAGE_KEYS } from './constants';
import GuestLogin from './components/GuestLogin';
import PropertyForm from './components/PropertyForm';
import GuestDashboard from './components/GuestDashboard';
import LandingPage from './components/LandingPage'; // 🟢 NUEVO
import HostDashboard from './components/HostDashboard'; // 🟢 NUEVO
import { translations } from './translations';
import { supabase } from './lib/supabaseClient';
import SuperAdminPanel from './components/SuperAdminPanel';
import OwnerLogin from './components/OwnerLogin';
import InitialSecurityConfig from './components/InitialSecurityConfig';

/// Capturamos TODO antes de limpiar la URL
const _urlParams  = new URLSearchParams(window.location.search);
const _hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
// ← AGREGA ESTAS DOS LÍNEAS AQUÍ, ANTES DE LIMPIAR
console.log('🔍 URL search completo:', window.location.search);
console.log('🔍 URL hash completo:', window.location.hash);
const INITIAL_ACTION        = _urlParams.get('action');
const INITIAL_SESSION_ID    = _urlParams.get('session_id');
const INITIAL_PLAN          = _urlParams.get('plan');
const INITIAL_CODE          = _urlParams.get('code');
const INITIAL_ACCESS_TOKEN  = _hashParams.get('access_token');

// Limpiamos la URL solo después de capturar todo
if (INITIAL_ACTION === 'reset-password') {
  // Limpiamos solo el query string — preservamos el hash para que Supabase lo procese
  window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
} else if (INITIAL_ACTION || INITIAL_CODE || INITIAL_ACCESS_TOKEN) {
  // Para otros casos, limpiamos todo
  window.history.replaceState({}, document.title, window.location.pathname);
}


const App: React.FC = () => {
  const [currentOwner, setCurrentOwner] = useState<Owner | null>(null);
  const [currentGuest, setCurrentGuest] = useState<AccessControl | null>(null);
  // 🟢 Lector de URL (Growth Hack)
  const [view, setView] = useState<AppView>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'signup') {
      return AppView.LANDING_PAGE; // Abre la vista de registro si viene de Marketing
    }
    return AppView.LOGIN_CHOICE; // Vista normal por defecto (Huéspedes)
  });
  const [properties, setProperties] = useState<PropertySettings[]>([]);
  const [, setAccessRecords] = useState<AccessControl[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertySettings | null>(null);

  const [isVerifying, setIsVerifying] = useState(
    INITIAL_ACTION === 'signup' && !!INITIAL_SESSION_ID
  );
  const [prefillEmail, setPrefillEmail] = useState<string>('');
  const [language, setLanguage] = useState<Language>('es');

  useEffect(() => {
    const savedLang = localStorage.getItem('ss_language') as Language;
    if (savedLang) setLanguage(savedLang);
  }, []);

  // 🟢 NUEVO: DETECTOR DE LINKS DE INVITACIÓN (/stay/[id])
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/stay/')) {
      const parts = path.split('/');
      const propertyShortId = parts[parts.indexOf('stay') + 1];
      if (propertyShortId) {
        handleAutoLoginGuest(propertyShortId);
      }
    }
  }, []);

 useEffect(() => {
  console.log('🚀 Params capturados:', { 
    action: INITIAL_ACTION, 
    sessionId: INITIAL_SESSION_ID,
    plan: INITIAL_PLAN 
  });

  // Función interna async para poder usar await
    const handleInitialAction = async () => {

      if (INITIAL_ACTION === 'reset-password') {
        // Supabase procesa el hash automáticamente al inicializar
        // El onAuthStateChange captura el SIGNED_IN sin conflicto de locks
        return;
      }
      if (INITIAL_ACTION === 'signup' && INITIAL_SESSION_ID) {
        verifyStripeSession(INITIAL_SESSION_ID);
      } else if (INITIAL_ACTION === 'signup') {
        setView(AppView.LANDING_PAGE);
      }
    };

    handleInitialAction();
}, []);

// useEffect dedicado SOLO para cambios de auth — va junto a los otros useEffects
 useEffect(() => {
    if (INITIAL_ACTION !== 'reset-password') return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event recibido:', event, '| User:', session?.user?.id);

        // Capturamos SIGNED_IN y PASSWORD_RECOVERY
        if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session?.user?.id) {
          subscription.unsubscribe();

          // Pequeña pausa para que el lock de Supabase se libere completamente
          await new Promise(resolve => setTimeout(resolve, 100));

          const { data: ownerData, error: ownerError } = await supabase
            .from('owners')
            .select('*')
            .eq('id', session.user.id)
            .single();

            console.log('👤 Owner query:', { ownerData, ownerError, userId: session.user.id });

          if (ownerData) {
            setCurrentOwner({
              id: ownerData.id,
              name: ownerData.name,
              email: ownerData.email || '',
              master_pin: ownerData.master_pin || '',
              token: ownerData.token,
              is_first_login: ownerData.is_first_login,
              tokenPersonalized: !ownerData.is_first_login,
              role: ownerData.role || 'owner',
              avatarUrl: ownerData.avatar_url,
              is_founder: ownerData.is_founder
            });
            setView(AppView.INITIAL_SECURITY);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // REEMPLAZA toda la función handleStartCheckout
  const handleStartCheckout = useCallback(async (planId: string, ownerOverride?: Owner) => {
    const owner = ownerOverride || currentOwner;

    if (!owner) {
      alert('Debes iniciar sesión antes de continuar con el pago.');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planId,
          ownerId: owner.id,
          email: owner.email
        }
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al conectar con la pasarela de pago.';
      alert(message);
    }
  }, [currentOwner]);

  // 🟢 NUEVO: DETECTOR DE COMPRA DE PLANES (Ej: ?plan=fundador)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planToBuy = params.get('plan');

    if (planToBuy && currentOwner) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleStartCheckout(planToBuy);
    }
  }, [currentOwner, handleStartCheckout]);

  // Restaura sesión activa al recargar la página
  useEffect(() => {
    const restoreSession = async () => {
      // Si estamos en un flujo de reset, no restauramos sesión aquí
      // El handleInitialAction ya se encarga de ese caso
      if (INITIAL_ACTION === 'reset-password' || INITIAL_ACCESS_TOKEN) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: ownerData } = await supabase
        .from('owners')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (ownerData) {
        setCurrentOwner({
          id: ownerData.id,
          name: ownerData.name,
          email: ownerData.email || '',
          master_pin: ownerData.master_pin || '',
          token: ownerData.token,
          is_first_login: ownerData.is_first_login,
          tokenPersonalized: !ownerData.is_first_login,
          role: ownerData.role || 'owner',
          avatarUrl: ownerData.avatar_url,
          is_founder: ownerData.is_founder
        });

        if (!INITIAL_SESSION_ID) {
          setView(ownerData.is_first_login
            ? AppView.HOST_ONBOARDING
            : AppView.PROPERTY_LIST
          );
        }
      }
    };

    restoreSession();
  }, []);

  // Función auxiliar para procesar el link del huésped
  const handleAutoLoginGuest = async (shortId: string) => {
  try {
    // 1. Limpiamos cualquier rastro anterior
    setSelectedProperty(null); 

    // 2. Construimos el rango de búsqueda para el UUID
    // Un UUID tiene un formato 8-4-4-4-12. Al usar los primeros 8 caracteres,
    // buscamos desde el valor más bajo (0000...) hasta el más alto (ffff...)
    const startRange = `${shortId}-0000-0000-0000-000000000000`;
    const endRange = `${shortId}-ffff-ffff-ffff-ffffffffffff`;

    // 3. Consultamos a Supabase usando comparadores de rango (GTE y LTE)
    // Esto es compatible con el tipo UUID y es extremadamente rápido.
    const { data: propertyData, error: propError } = await supabase
      .from('properties')
      .select('*')
      .gte('id', startRange)
      .lte('id', endRange)
      .maybeSingle();

    if (propError) throw propError;

    if (!propertyData) {
      console.warn("⚠️ No se encontró ninguna propiedad con ese ID corto.");
      setView(AppView.LOGIN_CHOICE);
      return;
    }

    // 4. Mapeo de datos (De Base de Datos a la App)
    const cleanProperty: PropertySettings = {
      ...propertyData,
      ownerId: propertyData.owner_id,
      buildingName: propertyData.building_name || 'Bienvenido',
      hostName: propertyData.host_name,
      wifiSSID: propertyData.wifi_ssid,
      wifiPass: propertyData.wifi_pass,
      welcomeImageUrl: propertyData.welcome_image_url, 
      stayImageUrl: propertyData.stay_image_url,
      checkoutInstructions: propertyData.checkout_instructions,
      whatsappContact: propertyData.whatsapp_contact,
      aiRecommendations: propertyData.ai_recommendations || {},
      location_lat: propertyData.location_lat,
      location_lng: propertyData.location_lng
    };

    setSelectedProperty(cleanProperty);
    
    // 5. Activamos la alfombra roja
    setView(AppView.GUEST_LOGIN); 

  } catch (err) {
    console.error("❌ Error al cargar la invitación:", err);
    // Si hay error, volvemos a la pantalla de entrada normal
    setView(AppView.LOGIN_CHOICE);
  }
};

  const handleToggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('ss_language', newLang);
  };

  const t = translations[language];

  // 🟢 LA NUEVA PUERTA DE ENTRADA DESDE LA LANDING PAGE
  const handleLandingLoginSuccess = async (ownerData: OwnerRow) => {
    const formattedOwner: Owner = {
      id: ownerData.id,
      name: ownerData.name,
      email: ownerData.email || '',
      master_pin: ownerData.master_pin || '',
      token: ownerData.token,
      is_first_login: ownerData.is_first_login,
      tokenPersonalized: !ownerData.is_first_login,
      role: ownerData.role || 'owner',
      avatarUrl: ownerData.avatar_url,
      is_founder: ownerData.is_founder
    };

    setCurrentOwner(formattedOwner);

   // EN handleLandingLoginSuccess — reemplaza las líneas 191-196
    if (formattedOwner.role !== 'superadmin' && ownerData.subscription_status !== 'active') {
      // Pasamos formattedOwner directamente — no dependemos del estado de React
      await handleStartCheckout('fundador', formattedOwner);
      return;
    }
    // Descargamos las propiedades reales
    const { data: userProps, error: propsError } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', ownerData.id);

    if (!propsError && userProps) {
      const formattedProps = userProps.map(p => ({
        ...p,
        ownerId: p.owner_id,
        buildingName: p.building_name,
        hostName: p.host_name,
        wifiSSID: p.wifi_ssid,           
        wifiPass: p.wifi_pass,           
        checkoutInstructions: p.checkout_instructions, 
        welcomeImageUrl: p.welcome_image_url,
        stayImageUrl: p.stay_image_url,
        whatsappContact: p.whatsapp_contact,
        aiRecommendations: p.ai_recommendations
      }));
      setProperties(formattedProps);
    }
    
    // Enrutamiento inteligente
    if (formattedOwner.role === 'superadmin') {
      setView(AppView.SUPER_ADMIN_PANEL);
    } else if (formattedOwner.is_first_login) {
      setView(AppView.HOST_ONBOARDING); // Va al video
    } else {
      setView(AppView.PROPERTY_LIST); // Va a sus propiedades
    }
  };

  const handleGuestLogin = (property: PropertySettings, guest: AccessControl) => {
    const formattedProperty: PropertySettings = {
      ...property,
      welcomeImageUrl: property.welcomeImageUrl || '',
      stayImageUrl: property.stayImageUrl || '',
      whatsappContact: property.whatsappContact || ''
    };
    const formattedGuest: AccessControl = {
      ...guest,
      issuedAt: (guest.issuedAt ? new Date(guest.issuedAt).getTime() : Date.now()).toString()
    };
    setCurrentGuest(formattedGuest);
    setSelectedProperty(formattedProperty);
    setView(AppView.GUEST_DASHBOARD);
  };

  const handleCheckIn = async (accessId: string) => {
    const nowISO = new Date().toISOString();
    try {
      const { data, error } = await supabase.from('access_control').update({ checkin_status: true, issued_at: nowISO }).eq('id', accessId).select().single();
      if (error) throw error;

      const updatedGuest: AccessControl = {
        id: data.id,
        propertyId: data.property_id,
        guestName: data.guest_name,
        checkIn: data.check_in,
        checkOut: data.check_out,
        bookingCode: data.booking_code,
        doorCode: data.door_code,
        checkinStatus: data.checkin_status,
        registrationDate: data.registration_date,
        issuedAt: data.issued_at ? new Date(data.issued_at).getTime().toString() : Date.now().toString(),
        doorCodeDuration: data.door_code_duration || undefined
      };
      setCurrentGuest(updatedGuest);
      setAccessRecords(prev => prev.map(a => a.id === accessId ? updatedGuest : a));
    } catch (err) {
      console.error("Error crítico en el proceso de Check-in:", err);
      alert("No se pudo completar el check-in. Verifica tu conexión.");
    }
  };

  const handleSaveProperty = async (updatedProp: PropertySettings, updatedAccess: AccessControl, newAvatarUrl?: string ) => {
    setProperties(prevProps => {
      const exists = prevProps.some(p => p.id === updatedProp.id);
      let newProps;
      if (exists) newProps = prevProps.map(p => p.id === updatedProp.id ? updatedProp : p);
      else newProps = prevProps.map(p => p.id === selectedProperty?.id ? updatedProp : p);
      
      localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(newProps));
      return newProps;
    });

    setAccessRecords(prevAccess => {
      const accessExists = prevAccess.some(a => a.bookingCode === updatedAccess.bookingCode);
      const newAccess = accessExists ? prevAccess.map(a => a.bookingCode === updatedAccess.bookingCode ? updatedAccess : a) : [...prevAccess, updatedAccess];
      localStorage.setItem(STORAGE_KEYS.ACCESS_CONTROL, JSON.stringify(newAccess));
      return newAccess;
    });

    if (currentOwner) {
      const updatedOwnerInfo = { ...currentOwner };
      if (newAvatarUrl) updatedOwnerInfo.avatarUrl = newAvatarUrl;
      
      // 🟢 Si es su primer login, lo marcamos como falso en la DB y en local
      if (currentOwner.is_first_login) {
        updatedOwnerInfo.is_first_login = false;
        await supabase.from('owners').update({ is_first_login: false }).eq('id', currentOwner.id);
      }
      
      setCurrentOwner(updatedOwnerInfo);
    }
    setSelectedProperty(updatedProp);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentOwner(null);
    setSelectedProperty(null);
    setProperties([]);
    setView(AppView.LOGIN_CHOICE);
  };
  
  const handleHostAccess = () => {
    setView(AppView.OWNER_LOGIN); 
  };

  const createNewProperty = (initialData?: NewPropertyInitialData) => {
    if (!currentOwner) return;
    const newPropId = `p${Date.now()}`;
    
    const newProp: PropertySettings = {
      id: newPropId,
      ownerId: currentOwner.id,
      buildingName: initialData?.propName || '', // 🟢 Toma el nombre del Dashboard
      hostName: currentOwner.name, 
      city: initialData?.city || '',             // 🟢 Toma la ciudad
      address: initialData?.address || '',       // 🟢 Toma la dirección
      stayImageUrl: initialData?.bgImage || '', // 🟢 Toma la imagen de fondo
      capacity: '', rooms: 0, bathrooms: 0,
      wifiSSID: '', wifiPass: '', rules: '', guides: '', 
      checkoutInstructions: '', whatsappContact: '', welcomeImageUrl: ''
    };

    const updatedProps = [...properties, newProp];
    setProperties(updatedProps);
    localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(updatedProps));
    setSelectedProperty(newProp);
    setView(AppView.PROPERTY_DETAIL);
  };

    const verifyStripeSession = async (sessionId: string) => {
      setIsVerifying(true); // ya está en true desde el estado inicial, pero por seguridad
      try {
        const { data, error } = await supabase.functions.invoke('verify-stripe-session', {
          body: { sessionId }
        });

        if (error || !data?.owner) {
          setView(AppView.LANDING_PAGE);
          return;
        }

        const owner = data.owner;
        setCurrentOwner({
          id: owner.id,
          name: owner.name,
          email: owner.email || '',
          master_pin: owner.master_pin || '',
          token: owner.token,
          is_first_login: owner.is_first_login,
          tokenPersonalized: !owner.is_first_login,
          role: owner.role || 'owner',
          avatarUrl: owner.avatar_url,
          is_founder: owner.is_founder
        });

        setView(owner.is_first_login
          ? AppView.HOST_ONBOARDING
          : AppView.PROPERTY_LIST
        );

      } catch {
        setView(AppView.LANDING_PAGE);
      } finally {
        setIsVerifying(false); // siempre apagamos el loader al terminar
      }
    };

     // 🔄 PANTALLA DE VERIFICACIÓN — va ANTES del return principal
      if (isVerifying) {
        return (
          <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-6">
            <img src="/logo.png" alt="HostFlow" className="w-16 h-16 animate-pulse" />
            <p className="text-white/60 text-sm font-bold uppercase tracking-[0.3em]">
              Verificando tu pago...
            </p>
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        );
      }
      
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      {/* Header Responsivo Owner */}
      {currentOwner && view !== AppView.GUEST_DASHBOARD && view !== AppView.HOST_ONBOARDING && (
        <nav className="bg-white border-b border-slate-100 px-4 sm:px-8 py-4 sm:py-6 flex justify-between items-center sticky top-0 z-[100] shadow-sm animate-in fade-in duration-500">
          <div className="flex flex-col">
            <span className="text-[#0052FF] text-[8px] sm:text-[10px] font-black tracking-[0.35em] mb-1">
              HostFlow
            </span>
            <h1 key={selectedProperty?.id || 'default'} className="text-xl sm:text-3xl font-black text-[#212121] tracking-tighter animate-in fade-in slide-in-from-left-2 duration-700 truncate max-w-[200px] sm:max-w-none">
              {selectedProperty ? selectedProperty.buildingName : t.owner.dashboardTitle}
            </h1>
          </div>
          <div className="flex items-center space-x-4 sm:space-x-8">
            <button onClick={handleLogout} className="text-[9px] sm:text-[10px] font-black tracking-widest text-slate-300 hover:text-red-500 transition-colors uppercase border-l border-slate-100 pl-4 sm:pl-8 h-10">
              {t.common.logout}
            </button>
          </div>
        </nav>
      )}

      {/* Guest Navbar */}
       {/* 🟢 NAVBAR DINÁMICA: Muestra el nombre del inmueble o HostFlow por defecto */}
      {!currentOwner && (view === AppView.LOGIN_CHOICE || view === AppView.GUEST_LOGIN) && (
        <nav className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center space-x-2">
            <span className="font-black text-lg sm:text-xl tracking-tighter uppercase text-slate-900 truncate">
              {/* Si hay una propiedad seleccionada y tiene nombre, lo muestra. Si no, muestra HostFlow */}
              {selectedProperty?.buildingName || 'HostFlow'}
            </span>
          </div>
        </nav>
      )}

      <main>
          {/* 🚪 PUERTA DE ENTRADA LIMPIA */}
            {view === AppView.LOGIN_CHOICE && (
              <GuestLogin 
                onLoginSuccess={handleGuestLogin} 
                language={language}
                onToggleLanguage={handleToggleLanguage}
                onExit={() => setView(AppView.LOGIN_CHOICE)}
                onHostAccess={handleHostAccess} 
              />
            )}

            {/* 🟢 VISTA DE BIENVENIDA PERSONALIZADA (Vía Link) */}
            {view === AppView.GUEST_LOGIN && selectedProperty && (
              <GuestLogin 
                property={selectedProperty} 
                onLoginSuccess={handleGuestLogin} 
                language={language}
                onToggleLanguage={handleToggleLanguage}
                onExit={() => setView(AppView.LOGIN_CHOICE)}
                onHostAccess={handleHostAccess} 
              />
            )}

            {/* 🟢 LA NUEVA PUERTA DE ENTRADA (LANDING PAGE) */}
            {view === AppView.LANDING_PAGE && (
              <LandingPage 
                onLoginSuccess={handleLandingLoginSuccess}
                autoOpenModal={INITIAL_ACTION === 'signup' && !INITIAL_SESSION_ID}
              />
            )}

            {/* 🟢 EL DASHBOARD DE BIENVENIDA (Solo Nuevos) */}
            {view === AppView.HOST_ONBOARDING && currentOwner && (
              <HostDashboard 
                user={currentOwner} 
                onLogout={handleLogout} 
                onStartCreating={createNewProperty} // Llama a la función real!
              />
            )}
                    
            {view === AppView.PROPERTY_LIST && currentOwner && (
              (() => {
                const userPropertiesCount = properties.filter(p => p.ownerId === currentOwner.id).length;
                const isAddDisabled = currentOwner.is_founder && userPropertiesCount >= 1;

                return (
                  <div className="py-12 sm:py-16 px-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex flex-col sm:flex-row justify-between items-end mb-12 gap-6 border-b border-slate-100 pb-8">
                      <div className="text-center sm:text-left">
                        <span className="text-[#0052FF] text-[10px] font-black tracking-[0.4em] uppercase mb-2 block">Gestión de Activos</span>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{t.owner.listTitle}</h2>
                      </div>
                      
                      {/* 🟢 BOTÓN INTELIGENTE (Reemplaza tu botón actual por este) */}
                      <button 
                        onClick={isAddDisabled ? undefined : createNewProperty} 
                        disabled={isAddDisabled}
                        title={isAddDisabled ? "Plan Fundador limitado a 1 propiedad. Actualiza tu plan para más." : ""}
                        className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 ${
                          isAddDisabled 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none' 
                            : 'bg-[#0052FF] text-white shadow-2xl shadow-blue-500/30 hover:bg-blue-600 hover:-translate-y-1 active:scale-95'
                        }`}
                      >
                        {isAddDisabled ? '+ Añadir inmueble' : t.owner.addProp}
                      </button>
                    </div>
            
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {properties.filter(p => p.ownerId === currentOwner.id).map(prop => (
                    <div key={prop.id} onClick={() => { setSelectedProperty(prop); setView(AppView.PROPERTY_DETAIL); }} className="group bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-50 hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] hover:-translate-y-3 cursor-pointer transition-all duration-500 overflow-hidden">
                      <div className="relative aspect-video overflow-hidden">
                        <div className="absolute inset-0 bg-slate-200 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: prop.stayImageUrl ? `url(${prop.stayImageUrl})` : '', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        <div className="absolute top-5 right-5">
                          <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black text-slate-900 uppercase tracking-widest shadow-sm">{prop.city}</span>
                        </div>
                      </div>
                      <div className="p-8 sm:p-10">
                        <h3 className="font-black text-slate-900 text-2xl tracking-tighter mb-2 group-hover:text-[#0052FF] transition-colors duration-300">{prop.buildingName || 'Nueva Propiedad'}</h3>
                        <div className="flex items-center text-slate-400 space-x-2">
                          <p className="text-[11px] font-bold uppercase tracking-widest truncate">{prop.address || 'Sin dirección'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        )}

        {view === AppView.PROPERTY_DETAIL && selectedProperty && currentOwner && (
            <PropertyForm 
              property={selectedProperty} 
              onSave={handleSaveProperty} 
              onBack={() => { setSelectedProperty(null); setView(AppView.PROPERTY_LIST); }} 
              language={language} 
              onToggleLanguage={handleToggleLanguage} 
              isFounder={currentOwner.is_founder} // 🟢 NUEVO: Pasamos el estatus
            />
        )}

       {/* 🟢 LA NUEVA PUERTA DE ACCESO DIRECTO PARA ANFITRIONES */}
        {view === AppView.OWNER_LOGIN && (
          <OwnerLogin 
            onLoginSuccess={handleLandingLoginSuccess} 
            defaultEmail={prefillEmail}
            onBack={() => {
              if (selectedProperty) {
                setView(AppView.GUEST_LOGIN);
              } else {
                setView(AppView.LOGIN_CHOICE);
              }
            }}             
          />
        )}

        {/* 🔐 CAMBIO DE CONTRASEÑA (Reset Password) */}
       {view === AppView.INITIAL_SECURITY && currentOwner && (
        <InitialSecurityConfig
          owner={currentOwner}
          onConfigSuccess={async (updatedOwner: Owner) => {
            const email = updatedOwner.email;
            await supabase.auth.signOut();
            setCurrentOwner(null);
            setProperties([]);
            setPrefillEmail(email);
            setView(AppView.OWNER_LOGIN);
          }}
          language={language}
        />
      )}

        {view === AppView.SUPER_ADMIN_PANEL && (
          <SuperAdminPanel onLogout={handleLogout} />
        )}

        {view === AppView.GUEST_DASHBOARD && selectedProperty && currentGuest && (
          <GuestDashboard property={selectedProperty} access={currentGuest} onCheckIn={handleCheckIn} onLogout={handleLogout} language={language} onToggleLanguage={handleToggleLanguage} />
        )}
      </main>
    </div>
  );
};

export default App;