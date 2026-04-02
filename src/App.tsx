import React, { useState, useEffect, useMemo } from 'react';
import { type Owner, type PropertySettings, type AccessControl, type Language } from './types';
import { AppView } from "./types";
import { MOCK_OWNERS, MOCK_PROPERTIES, MOCK_ACCESS, STORAGE_KEYS } from './constants';
import GuestLogin from './components/GuestLogin';
import PropertyForm from './components/PropertyForm';
import GuestDashboard from './components/GuestDashboard';
import LandingPage from './components/LandingPage'; // 🟢 NUEVO
import HostDashboard from './components/HostDashboard'; // 🟢 NUEVO
import { translations } from './translations';
import { supabase } from './lib/supabaseClient';
import SuperAdminPanel from './components/SuperAdminPanel';
import OwnerLogin from './components/OwnerLogin';

const App: React.FC = () => {
  const [owners, setOwners] = useState<Owner[]>([]);
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
  const [accessRecords, setAccessRecords] = useState<AccessControl[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertySettings | null>(null);
  const [error, setError] = useState<string>('');
  
  const [language, setLanguage] = useState<Language>('es');

  useEffect(() => {
    const savedOwners = localStorage.getItem(STORAGE_KEYS.OWNERS);
    const savedProps = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
    const savedAccess = localStorage.getItem(STORAGE_KEYS.ACCESS_CONTROL);
    const savedLang = localStorage.getItem('ss_language') as Language;

    if (savedOwners) setOwners(JSON.parse(savedOwners));
    else { setOwners(MOCK_OWNERS); localStorage.setItem(STORAGE_KEYS.OWNERS, JSON.stringify(MOCK_OWNERS)); }

    setProperties(savedProps ? JSON.parse(savedProps) : MOCK_PROPERTIES);
    setAccessRecords(savedAccess ? JSON.parse(savedAccess) : MOCK_ACCESS);
    if (savedLang) setLanguage(savedLang);
  }, []);

  const handleToggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('ss_language', newLang);
  };

  const t = translations[language];

  // 🟢 LA NUEVA PUERTA DE ENTRADA DESDE LA LANDING PAGE
  const handleLandingLoginSuccess = async (ownerData: any) => {
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

  const handleGuestLogin = (property: any, guest: AccessControl) => {
    const formattedProperty: PropertySettings = {
      ...property,
      welcomeImageUrl: property.welcome_image_url || property.welcomeImageUrl || '',
      stayImageUrl: property.stay_image_url || property.stayImageUrl || '',
      whatsappContact: property.whatsapp_contact || property.whatsappContact || ''
    };
    const formattedGuest: AccessControl = {
      ...guest,
      issuedAt: (guest.issuedAt ? new Date(guest.issuedAt).getTime() : Date.now()).toString()
    };
    setCurrentGuest(formattedGuest);
    setSelectedProperty(formattedProperty);
    setView(AppView.GUEST_DASHBOARD);
    setError('');
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

  const handleLogout = () => {
    setCurrentOwner(null);
    setCurrentGuest(null);
    setSelectedProperty(null);
    setError('');
    localStorage.clear(); 
    sessionStorage.clear();
    setView(AppView.LOGIN_CHOICE); 
  };
  
  const handleHostAccess = () => {
    setView(AppView.OWNER_LOGIN); 
  };

  const createNewProperty = () => {
    if (!currentOwner) return;
    const newPropId = `p${Date.now()}`;
    const newProp: PropertySettings = {
      id: newPropId,
      ownerId: currentOwner.id,
      buildingName: '', 
      hostName: currentOwner.name, 
      city: '', address: '', capacity: '', rooms: 0, bathrooms: 0,
      wifiSSID: '', wifiPass: '', rules: '', guides: '', checkoutInstructions: '', whatsappContact: '', welcomeImageUrl: '', stayImageUrl: ''
    };

    const updatedProps = [...properties, newProp];
    setProperties(updatedProps);
    localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(updatedProps));
    setSelectedProperty(newProp);
    setView(AppView.PROPERTY_DETAIL);
  };

  const bgImage = useMemo(() => {
    const featuredProperty = selectedProperty || properties[0];
    return featuredProperty?.stayImageUrl || 'https://images.unsplash.com/photo-1549517045-bc93de075e53?auto=format&fit=crop&w=1600&q=80';
  }, [selectedProperty, properties]);

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
      {!currentOwner && view === AppView.LOGIN_CHOICE && (
        <nav className="bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center space-x-2">
            <span className="font-black text-lg sm:text-xl tracking-tighter uppercase text-slate-900 truncate">
              HostFlow
            </span>
          </div>
        </nav>
      )}

      <main>
        {/* LA PUERTA DE LOS HUÉSPEDES */}
        {view === AppView.LOGIN_CHOICE && (
          <div className="relative min-h-[calc(100vh-72px)] flex flex-col items-center overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105" style={{ backgroundImage: `url(${bgImage})` }}>
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"></div>
            </div>
           <div className="flex flex-col items-center">
              <GuestLogin 
                onLoginSuccess={handleGuestLogin} 
                language={language}
                onToggleLanguage={handleToggleLanguage}
                onExit={() => setView(AppView.LOGIN_CHOICE)}
                onHostAccess={handleHostAccess} 
              />
              <button onClick={handleHostAccess} className="-mt-4 text-[9px] font-black text-white/50 uppercase tracking-[0.3em] z-20 hover:text-white transition-colors">
                ACCESO ANFITRIÓN
              </button>
            </div>
          </div>
        )}

        {/* 🟢 LA NUEVA PUERTA DE ENTRADA (LANDING PAGE) */}
        {view === AppView.LANDING_PAGE && (
          <LandingPage onLoginSuccess={handleLandingLoginSuccess} />
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
            onLoginSuccess={handleLandingLoginSuccess} // Reutilizamos tu lógica perfecta de enrutamiento
            onBack={() => setView(AppView.LOGIN_CHOICE)} 
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