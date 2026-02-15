
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
import { supabase } from './lib/supabaseClient';
import SuperAdminPanel from './components/SuperAdminPanel'; // 🟢 Verifica que la ruta sea correcta

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

  const handleOwnerLogin = async (emailInput: string, pinOrToken: string) => {
    // 1. Limpieza de entradas y reseteo de error
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanValue = pinOrToken.trim();
    setError('');

    // Función auxiliar interna para procesar el éxito del login
    const processLogin = async (owner: any) => {
      const formattedOwner: Owner = {
        id: owner.id,
        name: owner.name,
        email: owner.email || '',
        master_pin: owner.master_pin || '',
        token: owner.token,
        is_first_login: owner.is_first_login,
        tokenPersonalized: !owner.is_first_login,
        role: owner.role || 'owner',
        avatarUrl: owner.avatar_url // Mapeo de snake_case a camelCase
      };

      setCurrentOwner(formattedOwner);

      // 🚀 LOGRO: Descargamos las propiedades reales de este dueño de Supabase
      const { data: userProps, error: propsError } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', owner.id);

      if (!propsError && userProps) {
        const formattedProps = userProps.map(p => ({
          ...p,
          // Traducimos de snake_case (DB) a camelCase (App)
          ownerId: p.owner_id,
          buildingName: p.building_name,
          hostName: p.host_name,
          wifiSSID: p.wifi_ssid,           // 🟢 AÑADIR ESTE
          wifiPass: p.wifi_pass,           // 🟢 AÑADIR ESTE
          checkoutInstructions: p.checkout_instructions, // 🟢 AÑADIR ESTE
          welcomeImageUrl: p.welcome_image_url,
          stayImageUrl: p.stay_image_url,
          whatsappContact: p.whatsapp_contact,
          aiRecommendations: p.ai_recommendations
        }));

        setProperties(formattedProps); // 👈 Actualiza la lista visual
  }
      
      // 🟢 DIRECCIONAMIENTO SEGÚN ROL
      if (formattedOwner.role === 'superadmin') {
        setView(AppView.SUPER_ADMIN_PANEL);
      } else if (formattedOwner.is_first_login) {
        setView(AppView.INITIAL_SECURITY);
      } else {
        setView(AppView.PROPERTY_LIST);
      }
    };

    try {
      // 🔍 PASO 1: ¿Es un Token de Invitación nuevo?
      // Buscamos si el 'cleanValue' coincide con un token de alguien que no ha entrado nunca.
      const { data: inviteOwner, error: inviteError } = await supabase
        .from('owners')
        .select('*')
        .eq('token', cleanValue)
        .eq('is_first_login', true)
        .maybeSingle(); // Evita el error 406 si no encuentra nada

      if (inviteOwner) {
        await processLogin(inviteOwner);
        return;
      }

      // 🔍 PASO 2: Si no fue invitación, ¿es un Login normal de administrador registrado?
      // Aquí validamos la pareja EMAIL + PIN MAESTRO.
      const { data: registeredOwner, error: regError } = await supabase
        .from('owners')
        .select('*')
        .eq('email', cleanEmail)
        .eq('master_pin', cleanValue)
        .maybeSingle();

      if (registeredOwner) {
        await processLogin(registeredOwner);
      } else {
        // ❌ Error de credenciales (Bilingüe)
        setError(
          language === 'es' 
            ? 'Credenciales o Token no válidos. Verifique e intente de nuevo.' 
            : 'Invalid Credentials or Token. Please check and try again.'
        );
      }

    } catch (err) {
      console.error("Error crítico en login:", err);
      // ❌ Error de conexión (Bilingüe)
      setError(
        language === 'es' 
          ? 'Error de conexión con el servidor.' 
          : 'Server connection error.'
      );
    }
  };

  const handleTokenPersonalization = (newToken: string) => {
    if (!currentOwner) return;
    const updatedOwners = owners.map(o => o.id === currentOwner.id ? { ...o, token: newToken, tokenPersonalized: true } : o);
    setOwners(updatedOwners);
    localStorage.setItem(STORAGE_KEYS.OWNERS, JSON.stringify(updatedOwners));
    handleLogout();
  };

  // Ubicación: App.tsx (Línea 145 aprox.)
  const handleGuestLogin = (property: any, guest: AccessControl) => {
    // 🟢 TRADUCCIÓN AGRESIVA: 
    // Tomamos los nombres de la DB y los convertimos a los nombres que usa tu diseño.
    const formattedProperty: PropertySettings = {
      ...property,
      welcomeImageUrl: property.welcome_image_url || property.welcomeImageUrl || '',
      stayImageUrl: property.stay_image_url || property.stayImageUrl || '',
      whatsappContact: property.whatsapp_contact || property.whatsappContact || ''
    };

    // También aseguramos que el tiempo de entrada sea un string para el temporizador
    const formattedGuest: AccessControl = {
      ...guest,
      issuedAt: (guest.issuedAt ? new Date(guest.issuedAt).getTime() : Date.now()).toString()
    };

    // Guardamos en el estado los datos ya "traducidos"
    setCurrentGuest(formattedGuest);
    setSelectedProperty(formattedProperty);
    
    setView(AppView.GUEST_DASHBOARD);
    setError('');
  };


 const handleCheckIn = async (accessId: string) => {
  // 1. Generamos la marca de tiempo exacta para el temporizador luxury
  const nowISO = new Date().toISOString();

  try {
    // 2. Actualizamos Supabase: activamos el estado y grabamos la hora de emisión
    const { data, error } = await supabase
      .from('access_control')
      .update({ 
        checkin_status: true, 
        issued_at: nowISO 
      })
      .eq('id', accessId)
      .select()
      .single();

    if (error) throw error;

    // 3. Mapeamos la respuesta de la base de datos a tu interfaz de TypeScript
    // Esto asegura que el Dashboard reciba los datos exactos que espera
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
      issuedAt: data.issued_at ? new Date(data.issued_at).getTime().toString() : Date.now().toString()// Esta es la clave para el temporizador
    };

    // 4. Actualizamos el estado actual: esto "ilumina" los botones de la interfaz al instante
    setCurrentGuest(updatedGuest);

    // Opcional: Si quieres mantener una copia local en accessRecords (aunque ya no es crítico)
    setAccessRecords(prev => prev.map(a => a.id === accessId ? updatedGuest : a));

  } catch (err) {
    console.error("Error crítico en el proceso de Check-in:", err);
    alert("No se pudo completar el check-in. Verifica tu conexión.");
  }
};

      const handleSaveProperty = (updatedProp: PropertySettings, updatedAccess: AccessControl, newAvatarUrl?: string ) => {
      setProperties(prevProps => {
        // Buscamos si ya existe por el nuevo ID
        const exists = prevProps.some(p => p.id === updatedProp.id);
        
        let newProps;
        if (exists) {
          // Si existe, actualizamos normal
          newProps = prevProps.map(p => p.id === updatedProp.id ? updatedProp : p);
        } else {
          // 🟢 CLAVE: Si el ID no coincide, es porque acaba de recibir un UUID de Supabase.
          // Reemplazamos la propiedad seleccionada actualmente por la nueva con UUID.
          newProps = prevProps.map(p => p.id === selectedProperty?.id ? updatedProp : p);
        }
        
        localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(newProps));
        return newProps;
      });

      setAccessRecords(prevAccess => {
        const accessExists = prevAccess.some(a => a.bookingCode === updatedAccess.bookingCode);
        const newAccess = accessExists 
          ? prevAccess.map(a => a.bookingCode === updatedAccess.bookingCode ? updatedAccess : a) 
          : [...prevAccess, updatedAccess];
        
        localStorage.setItem(STORAGE_KEYS.ACCESS_CONTROL, JSON.stringify(newAccess));
        return newAccess;
      });
      // Si el dueño actual es el que está editando, refrescamos su avatar en pantalla
      if (currentOwner && newAvatarUrl) {
        setCurrentOwner({
          ...currentOwner,
          avatarUrl: newAvatarUrl // Asegúrate de que esta variable llegue o se tome del estado
        });
      }
      // Actualizamos la propiedad seleccionada con su nuevo UUID oficial
      setSelectedProperty(updatedProp);
    };

 

  const handleLogout = () => {
    // 1. Limpiamos los estados de identidad
    setCurrentOwner(null);
    setCurrentGuest(null);
    setSelectedProperty(null);
    
    // 2. Limpiamos errores o estados temporales
    setError('');
    
    // 3. LIMPIEZA DE MEMORIA (Vital para seguridad)
    // Borra todo lo que hayamos guardado en el navegador
    localStorage.clear(); 
    sessionStorage.clear();

    // 4. Redirigimos a la pantalla de inicio (Selección: Dueño / Huésped)
    // Asegúrate de que 'AppView.LOGIN_CHOICE' sea el nombre de tu vista inicial
    setView(AppView.LOGIN_CHOICE); 

    // 5. Opcional: Pequeño truco para asegurar limpieza total de caché
    // window.location.reload(); 
  };
  
  const handleHostAccess = () => {
    setView(AppView.OWNER_LOGIN); // O la vista que uses para el anfitrión
  };

  //CREAR UNA NUEVA PROPIEDAD
    const createNewProperty = () => {
    if (!currentOwner) return;
    
    // Usamos un ID temporal que luego Supabase reemplazará
    const newPropId = `p${Date.now()}`;
    
    // 🟢 INICIALIZACIÓN LIMPIA: Campos vacíos para obligar al usuario a llenarlos
    const newProp: PropertySettings = {
      id: newPropId,
      ownerId: currentOwner.id,
      buildingName: '', // Antes decía 'Nuevo Inmueble', ahora está vacío
      hostName: currentOwner.name, // Este sí lo mantenemos, es útil
      city: '', // Vacío
      address: '', // Vacío
      capacity: '', // Vacío
      rooms: 0,
      bathrooms: 0,
      wifiSSID: '',
      wifiPass: '',
      rules: '',
      guides: '',
      checkoutInstructions: '',
      whatsappContact: '',
      welcomeImageUrl: '',
      stayImageUrl: ''
    };

    // ... resto de la lógica de la función (setProperties, etc.) ...
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
            
                                    
            {/* MINIMALIST & DISCREET HOST ACCESS BUTTON */}
           <div className="flex flex-col items-center">
              <GuestLogin 
                onLoginSuccess={handleGuestLogin} 
                language={language}
                onToggleLanguage={handleToggleLanguage}
                onExit={() => setView(AppView.LOGIN_CHOICE)}
                onHostAccess={handleHostAccess} // Pasamos la función que acabamos de crear
              />
              
              {/* Botón externo (opcional, sube con -mt-4 para pegarse a la tarjeta) */}
              <button 
                onClick={handleHostAccess}
                className="-mt-4 text-[9px] font-black text-white/50 uppercase tracking-[0.3em] z-20 hover:text-white transition-colors"
              >
                ACCESO ANFITRIÓN
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
        
        {view === AppView.INITIAL_SECURITY && currentOwner && (
          <InitialSecurityConfig 
            owner={currentOwner} 
            language={language}
            onConfigSuccess={(updatedOwner) => {
              // 1. Actualizamos el estado global del dueño con los nuevos datos (Email/PIN)
              setCurrentOwner(updatedOwner);
              // 2. Lo enviamos directamente al Panel de Control (Dashboard)
              setView(AppView.PROPERTY_LIST);
            }} 
          />
        )}
                
        {view === AppView.PROPERTY_LIST && currentOwner && (
          <div className="py-12 sm:py-16 px-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
            
            {/* Encabezado Elegante */}
            <div className="flex flex-col sm:flex-row justify-between items-end mb-12 gap-6 border-b border-slate-100 pb-8">
              <div className="text-center sm:text-left">
                <span className="text-[#0052FF] text-[10px] font-black tracking-[0.4em] uppercase mb-2 block">Gestión de Activos</span>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{t.owner.listTitle}</h2>
              </div>
              
              <button 
                onClick={createNewProperty} 
                className="w-full sm:w-auto bg-[#0052FF] text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 hover:bg-blue-600 hover:-translate-y-1 active:scale-95 transition-all duration-300"
              >
                {t.owner.addProp}
              </button>
            </div>

            {/* Grid con Proporción de Video (16:9) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {properties.filter(p => p.ownerId === currentOwner.id).map(prop => (
                <div 
                  key={prop.id} 
                  onClick={() => { setSelectedProperty(prop); setView(AppView.PROPERTY_DETAIL); }} 
                  className="group bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-50 hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] hover:-translate-y-3 cursor-pointer transition-all duration-500 overflow-hidden"
                >
                  {/* Contenedor de Imagen con Aspect Ratio Fijo */}
                  <div className="relative aspect-video overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-slate-200 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" 
                      style={{ 
                        // Usamos stayImageUrl (que ahora ya viene traducida desde processLogin)
                        backgroundImage: prop.stayImageUrl ? `url(${prop.stayImageUrl})` : '',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {/* Overlay sutil para dar profundidad */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    
                    {/* Badge de Ciudad Flotante */}
                    <div className="absolute top-5 right-5">
                      <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black text-slate-900 uppercase tracking-widest shadow-sm">
                        {prop.city}
                      </span>
                    </div>
                  </div>

                  {/* Información con Tipografía Refinada */}
                  <div className="p-8 sm:p-10">
                    <h3 className="font-black text-slate-900 text-2xl tracking-tighter mb-2 group-hover:text-[#0052FF] transition-colors duration-300">
                      {prop.buildingName}
                    </h3>
                    <div className="flex items-center text-slate-400 space-x-2">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-[11px] font-bold uppercase tracking-widest truncate">
                        {prop.address}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Estado Vacío / Tarjeta de Ayuda si no hay propiedades */}
              {properties.filter(p => p.ownerId === currentOwner.id).length === 0 && (
                <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <span className="text-3xl">🏠</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">Comienza tu portafolio</h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8 font-medium">Aún no tienes inmuebles registrados. Crea el primero para empezar a recibir huéspedes.</p>
                </div>
              )}
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

        {view === AppView.SUPER_ADMIN_PANEL && (
          <SuperAdminPanel onLogout={handleLogout} />
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
