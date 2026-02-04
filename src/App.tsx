
import React, { useState, useEffect, useMemo } from 'react';
import { type Owner, type PropertySettings, type AccessControl, type Language } from './types';
import { AppView } from "./types";
import { MOCK_OWNERS, MOCK_PROPERTIES, MOCK_ACCESS, STORAGE_KEYS } from './constants';
import OwnerLogin from './components/OwnerLogin';
import GuestLogin from './components/GuestLogin';
import PropertyForm from './components/PropertyForm';
import GuestDashboard from './components/GuestDashboard';
import InitialSecurityConfig from './components/InitialSecurityConfig';
import { translations } from './translations';

const App: React.FC = () => {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [currentOwner, setCurrentOwner] = useState<Owner | null>(null);
  const [currentGuest, setCurrentGuest] = useState<AccessControl | null>(null);
  const [view, setView] = useState<AppView>(AppView.LOGIN_CHOICE);
  const [properties, setProperties] = useState<PropertySettings[]>([]);
  const [accessRecords, setAccessRecords] = useState<AccessControl[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertySettings | null>(null);
  const [error, setError] = useState<string>('');
  
  // Language State
  const [language, setLanguage] = useState<Language>('es');

  useEffect(() => {
    const savedOwners = localStorage.getItem(STORAGE_KEYS.OWNERS);
    const savedProps = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
    const savedAccess = localStorage.getItem(STORAGE_KEYS.ACCESS_CONTROL);
    const savedLang = localStorage.getItem('ss_language') as Language;

    // Inicialización Robusta
    if (savedOwners) {
        setOwners(JSON.parse(savedOwners));
    } else {
        setOwners(MOCK_OWNERS);
        localStorage.setItem(STORAGE_KEYS.OWNERS, JSON.stringify(MOCK_OWNERS));
    }

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

  const handleOwnerLogin = (token: string) => {
    // Validación tolerante a espacios
    const cleanToken = token.trim();
    const owner = owners.find(o => o.token === cleanToken);
    
    if (owner) {
      setCurrentOwner(owner);
      setError('');
      if (!owner.tokenPersonalized) setView(AppView.INITIAL_SECURITY);
      else setView(AppView.PROPERTY_LIST);
    } else setError('Token inválido.');
  };

  const handleTokenPersonalization = (newToken: string) => {
    if (!currentOwner) return;
    const updatedOwners = owners.map(o => o.id === currentOwner.id ? { ...o, token: newToken, tokenPersonalized: true } : o);
    setOwners(updatedOwners);
    localStorage.setItem(STORAGE_KEYS.OWNERS, JSON.stringify(updatedOwners));
    handleLogout();
  };

  const handleGuestLogin = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const access = accessRecords.find(a => a.bookingCode.trim().toUpperCase() === cleanCode);
    if (access) {
      const prop = properties.find(p => p.id === access.propertyId);
      if (prop) {
        setCurrentGuest(access);
        setSelectedProperty(prop);
        setView(AppView.GUEST_DASHBOARD);
        setError('');
      } else setError('Error técnico: Propiedad vinculada no encontrada.');
    } else setError('Código de reserva no encontrado.');
  };

  const handleCheckIn = (accessId: string) => {
    const nowString = new Date().toLocaleString();
    const nowTimestamp = Date.now(); // PERSISTENCIA CRÍTICA: Marca de tiempo absoluta
    
    const updatedAccess = accessRecords.map(a => 
      a.id === accessId 
      ? { ...a, checkinStatus: true, issuedAt: nowString, checkInTimestamp: nowTimestamp } 
      : a
    );
    
    setAccessRecords(updatedAccess);
    localStorage.setItem(STORAGE_KEYS.ACCESS_CONTROL, JSON.stringify(updatedAccess));
    
    const current = updatedAccess.find(a => a.id === accessId);
    if (current) setCurrentGuest(current);
  };

  const handleSaveProperty = (updatedProp: PropertySettings, updatedAccess: AccessControl) => {
    const newProperties = properties.map(p => p.id === updatedProp.id ? updatedProp : p);
    const accessExists = accessRecords.some(a => a.id === updatedAccess.id);
    const newAccessRecords = accessExists ? accessRecords.map(a => a.id === updatedAccess.id ? updatedAccess : a) : [...accessRecords, updatedAccess];
    localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(newProperties));
    localStorage.setItem(STORAGE_KEYS.ACCESS_CONTROL, JSON.stringify(newAccessRecords));
    setProperties(newProperties);
    setAccessRecords(newAccessRecords);
    setSelectedProperty(updatedProp);
  };

  const handleLogout = () => {
    setCurrentOwner(null);
    setCurrentGuest(null);
    setView(AppView.LOGIN_CHOICE);
    setSelectedProperty(null);
    setError('');
  };

  const createNewProperty = () => {
    if (!currentOwner) return;
    const seed = MOCK_PROPERTIES[0];
    const newPropId = `p${Date.now()}`;
    const newProp: PropertySettings = {
      id: newPropId,
      ownerId: currentOwner.id,
      buildingName: 'Nuevo Inmueble',
      hostName: currentOwner.name,
      city: seed.city,
      address: '',
      capacity: seed.capacity,
      rooms: seed.rooms,
      bathrooms: seed.bathrooms,
      wifiSSID: '',
      wifiPass: '',
      rules: seed.rules,
      guides: seed.guides,
      checkoutInstructions: seed.checkoutInstructions,
      whatsappContact: '',
      welcomeImageUrl: '',
      stayImageUrl: ''
    };
    const updatedProps = [...properties, newProp];
    setProperties(updatedProps);
    localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(updatedProps));
    setSelectedProperty(newProp);
    setView(AppView.PROPERTY_DETAIL);
  };

  const bgImage = useMemo(() => {
    const featuredProperty = selectedProperty || properties[0];
    return featuredProperty?.welcomeImageUrl || 'https://images.unsplash.com/photo-1549517045-bc93de075e53?auto=format&fit=crop&w=1600&q=80';
  }, [selectedProperty, properties]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      {/* Header Responsivo Owner */}
      {currentOwner && view !== AppView.GUEST_DASHBOARD && (
        <nav className="bg-white border-b border-slate-100 px-4 sm:px-8 py-4 sm:py-6 flex justify-between items-center sticky top-0 z-[100] shadow-sm animate-in fade-in duration-500">
          <div className="flex flex-col">
            <span className="text-[#0052FF] text-[8px] sm:text-[10px] font-black tracking-[0.35em] mb-1">
              @erasoDigital
            </span>
            <h1 
              key={selectedProperty?.id || 'default'} 
              className="text-xl sm:text-3xl font-black text-[#212121] tracking-tighter animate-in fade-in slide-in-from-left-2 duration-700 truncate max-w-[200px] sm:max-w-none"
            >
              {selectedProperty ? selectedProperty.buildingName : t.owner.dashboardTitle}
            </h1>
          </div>

          <div className="flex items-center space-x-4 sm:space-x-8">
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-800 leading-none mb-1">{currentOwner.name}</p>
                <div className="flex items-center justify-end space-x-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{t.owner.active}</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-50 flex-shrink-0">
                {currentOwner.avatarUrl ? (
                  <img src={currentOwner.avatarUrl} className="w-full h-full object-cover" alt="Owner" />
                ) : (
                  <div className="w-full h-full bg-blue-50 flex items-center justify-center text-[#0052FF] font-black">
                    {currentOwner.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="text-[9px] sm:text-[10px] font-black tracking-widest text-slate-300 hover:text-red-500 transition-colors uppercase border-l border-slate-100 pl-4 sm:pl-8 h-10"
            >
              {t.common.logout}
            </button>
          </div>
        </nav>
      )}

      {/* Guest Navbar (Minimalist) */}
      {!currentOwner && view === AppView.LOGIN_CHOICE && (
        <nav className="bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#0052FF] rounded-lg flex items-center justify-center text-white font-bold">
              {properties[0]?.buildingName?.charAt(0) || 'S'}
            </div>
            <span className="font-black text-lg sm:text-xl tracking-tighter uppercase text-slate-900 truncate max-w-[200px]">
              {properties[0]?.buildingName || "ShortStay"}
            </span>
          </div>
        </nav>
      )}

      <main>
        {view === AppView.LOGIN_CHOICE && (
          <div className="relative min-h-[calc(100vh-72px)] flex flex-col items-center overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105"
              style={{ backgroundImage: `url(${bgImage})` }}
            >
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"></div>
            </div>

            {/* FLOATING LANGUAGE SELECTOR */}
            <div className="absolute top-6 right-6 z-20">
               <button 
                  onClick={handleToggleLanguage}
                  className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all shadow-lg active:scale-95"
               >
                  {language === 'es' ? 'EN' : 'ES'}
               </button>
            </div>
            
            <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center p-4">
              <GuestLogin 
                onLogin={handleGuestLogin}
                error={error}
                t={t} // Passing translations manually to GuestLogin
              />
            </div>
            
            {/* MINIMALIST & DISCREET HOST ACCESS BUTTON */}
             <div className="relative z-10 w-full pb-8 flex justify-center">
              <button 
                onClick={() => setView(AppView.OWNER_LOGIN)} 
                className="text-white/40 hover:text-white transition-colors text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2"
              >
                {t.auth.hostAccessBtn}
              </button>
            </div>
          </div>
        )}

        {view === AppView.OWNER_LOGIN && (
            <div className="p-4">
                <OwnerLogin 
                    onLogin={handleOwnerLogin} 
                    onBack={() => { setError(''); setView(AppView.LOGIN_CHOICE); }}
                    error={error} 
                    t={t} // Passing translations manually to OwnerLogin
                />
            </div>
        )}
        
        {view === AppView.INITIAL_SECURITY && currentOwner && <InitialSecurityConfig owner={currentOwner} onUpdateToken={handleTokenPersonalization} />}
        
        {view === AppView.PROPERTY_LIST && currentOwner && (
          <div className="py-8 sm:py-12 px-4 sm:px-6 max-w-7xl mx-auto animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 sm:mb-10 gap-4">
              <h2 className="text-xl font-black text-slate-400 uppercase tracking-widest text-center sm:text-left">{t.owner.listTitle}</h2>
              <button onClick={createNewProperty} className="w-full sm:w-auto bg-[#0052FF] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">
                {t.owner.addProp}
              </button>
            </div>
            {/* Grid Responsivo para Inmuebles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {properties.filter(p => p.ownerId === currentOwner.id).map(prop => (
                <div key={prop.id} onClick={() => { setSelectedProperty(prop); setView(AppView.PROPERTY_DETAIL); }} className="group bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-2 cursor-pointer transition-all overflow-hidden">
                  <div className="h-48 sm:h-44 bg-slate-100 bg-cover bg-center transition-transform group-hover:scale-105" style={{ backgroundImage: prop.stayImageUrl ? `url(${prop.stayImageUrl})` : '' }}></div>
                  <div className="p-6 sm:p-8">
                    <h3 className="font-black text-slate-800 text-lg sm:text-xl tracking-tight mb-1 truncate">{prop.buildingName}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{prop.city}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {view === AppView.PROPERTY_DETAIL && selectedProperty && (
            <PropertyForm 
                property={selectedProperty} 
                onSave={handleSaveProperty} 
                onBack={() => { setSelectedProperty(null); setView(AppView.PROPERTY_LIST); }}
                language={language}
                onToggleLanguage={handleToggleLanguage}
            />
        )}
        {view === AppView.GUEST_DASHBOARD && selectedProperty && currentGuest && (
          <GuestDashboard 
            property={selectedProperty} 
            access={currentGuest} 
            onCheckIn={handleCheckIn} 
            onLogout={handleLogout}
            language={language}
            onToggleLanguage={handleToggleLanguage}
          />
        )}
      </main>
    </div>
  );
};

export default App;
