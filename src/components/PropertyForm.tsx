import React, { useState, useEffect, useMemo } from 'react';
import type { PropertySettings, AccessControl, Owner, Language } from '../types';
import { STORAGE_KEYS } from '../constants';
import { translations } from '../translations';
import { getNearbyPlaces } from '../services/geminiService';
import { getCoordinates } from '../services/geocodingService'; // Cambiado a nombre estándar
import { supabase } from '../lib/supabaseClient';
import ImageUploader from './ImageUploader';

interface PropertyFormProps {
  property: PropertySettings;
  onSave: (prop: PropertySettings, access: AccessControl, newAvatarUrl?: string) => void;
  onBack: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

type Tab = 'PROPIEDAD' | 'MULTIMEDIA' | 'RESERVAS' | 'GUIAS';

const PropertyForm: React.FC<PropertyFormProps> = ({ property, onSave, onBack, language, onToggleLanguage }) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<Tab>('PROPIEDAD');
  const [formData, setFormData] = useState<PropertySettings>(property);
  const [ownerAvatar, setOwnerAvatar] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [isBookingUnlocked, setIsBookingUnlocked] = useState(false);
  const [allAccessRecords, setAllAccessRecords] = useState<AccessControl[]>([]);
  
  const [dateErrors, setDateErrors] = useState<{ checkIn?: string; checkOut?: string }>({});
  const [propertyErrors, setPropertyErrors] = useState<string[]>([]);

  const [accessData, setAccessData] = useState<AccessControl>({
    id: `ac_${Date.now()}`,
    propertyId: property.id,
    guestName: '',
    checkIn: '',
    checkOut: '',
    bookingCode: '',
    doorCode: '',
    checkinStatus: false,
    issuedAt: null,
    registrationDate: null
  });

  // --- CARGA INICIAL DESDE NUBE (Prioridad Supabase) ---
  useEffect(() => {
   const loadInitialData = async () => {
    // 🟢 VALIDACIÓN: Solo buscamos si el ID es un UUID real (no empieza con 'p')
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(property.id);
    
    if (!isUUID) {
      console.log("ID temporal detectado, saltando consulta a Supabase");
      return; 
    }
      // 1. Cargar registros de acceso desde Supabase
      const { data: records, error } = await supabase
        .from('access_control')
        .select('*')
        .eq('property_id', property.id);
      
      if (!error && records) {
        const formattedRecords: AccessControl[] = records.map(r => ({
          id: r.id,
          propertyId: r.property_id,
          guestName: r.guest_name,
          checkIn: r.check_in,
          checkOut: r.check_out,
          bookingCode: r.booking_code,
          doorCode: r.door_code,
          checkinStatus: r.checkin_status,
          registrationDate: r.registration_date,
          issuedAt: r.issued_at
        }));
        setAllAccessRecords(formattedRecords);
        if (formattedRecords.length > 0) setIsBookingUnlocked(true);
      }

      // 2. Cargar Avatar del Dueño
      // 🟢 CARGA REAL DEL AVATAR DESDE SUPABASE
      const { data: ownerData } = await supabase
        .from('owners')
        .select('avatar_url')
        .eq('id', property.ownerId)
        .single();
      
      if (ownerData?.avatar_url) {
        setOwnerAvatar(ownerData.avatar_url);
      }
    };

    loadInitialData();
  }, [property.id, property.ownerId]);

  
  // --- PERSISTENCIA EN SUPABASE ---
  const saveToSupabase = async (propData: PropertySettings, guestData?: AccessControl) => {
    try {
      // VALIDACIÓN DE SEGURIDAD PARA UUID
      // Si el ownerId es "o1" (mock data), Supabase lo rechazará. 
      // Debes asegurarte de estar logueado con un UUID real.
      const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (!isUUID(propData.ownerId)) {
        console.warn("Owner ID no es un UUID válido. Usando ID de respaldo para pruebas.");
        // Para evitar el error 400 en localhost mientras pruebas:
        // propData.ownerId = "un-uuid-valido-de-tu-tabla-owners";
      }
      const propertyPayload: any = {
        owner_id: propData.ownerId,
        building_name: propData.buildingName,
        host_name: propData.hostName,
        city: propData.city,
        address: propData.address,
        capacity: propData.capacity,
        rooms: propData.rooms,
        bathrooms: propData.bathrooms,
        wifi_ssid: propData.wifiSSID,
        wifi_pass: propData.wifiPass,
        rules: propData.rules,
        guides: propData.guides,
        checkout_instructions: propData.checkoutInstructions,
        whatsapp_contact: propData.whatsappContact,
        welcome_image_url: propData.welcomeImageUrl,
        stay_image_url: propData.stayImageUrl,
        location_lat: propData.location_lat,
        location_lng: propData.location_lng,
        ai_recommendations: propData.aiRecommendations
      };

      // 🟢 SI EL ID ES UN UUID (Propiedad existente), LO INCLUIMOS PARA QUE SE ACTUALICE
      // SI NO, LO DEJAMOS FUERA PARA QUE SUPABASE CREE UNO NUEVO
      if (isUUID(propData.id)) {
        propertyPayload.id = propData.id;
      }

      const { data: savedProp, error: propError } = await supabase
        .from('properties')
        .upsert(propertyPayload, { onConflict: 'id' }) // Usamos 'id' como conflicto es más estándar
        .select()
        .single();

      if (propError) throw propError;

      // Capturamos el ID real que nos dio Supabase
        const realPropertyId = savedProp.id;

      if (guestData && guestData.guestName.trim() !== '' && guestData.guestName !== 'Sin Nombre') {
        const guestPayload = {
          property_id: realPropertyId,
          guest_name: guestData.guestName,
          check_in: guestData.checkIn,
          check_out: guestData.checkOut,
          booking_code: guestData.bookingCode.trim().toUpperCase(),
          door_code: guestData.doorCode,
          checkin_status: guestData.checkinStatus,
          registration_date: guestData.registrationDate || new Date().toISOString()
        };

        const { error: guestError } = await supabase
          .from('access_control')
          .upsert(guestPayload, { onConflict: 'booking_code' });

        if (guestError) throw guestError;
      }

      // 🟢 RETORNAMOS EL ID: Ahora handleSubmit sabrá quién es la propiedad
       return realPropertyId;

      } catch (err) {
        console.error("Error en sincronización:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`Error de base de datos: ${errorMessage}`);
        return null; // Si falla, retornamos null
      }

    };

  // --- FUNCIÓN ÚNICA DE EXPORTACIÓN (TAREA 2 FINALIZADA) ---
  const handleExportHistory = async () => {
    setIsSaving(true);
    try {

      const targetId = formData.id;

      const { data: history, error } = await supabase
        .from('access_control')
        .select('*')
        .eq('property_id', targetId)
        .order('check_in', { ascending: false });

      if (error) throw error;
      if (!history || history.length === 0) return alert(language === 'es' ? "No hay datos para exportar" : "No data to export");

      const headers = ["Huésped", "Entrada", "Salida", "Código Reserva", "Puerta", "Estado"];
      const csvRows = [
        headers.join(','),
        ...history.map(row => [
          `"${row.guest_name}"`, row.check_in, row.check_out, 
          row.booking_code, row.door_code, 
          row.checkin_status ? 'Completado' : 'Pendiente'
        ].join(','))
      ];

      const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Reporte_${property.buildingName.replace(/\s+/g, '_')}_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error al exportar:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // --- LÓGICA DE MEMO Y HELPERS ---
  const activeGuests = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    return allAccessRecords
      .filter(a => {
        if (!a.guestName || a.guestName.trim() === '' || a.guestName.toLowerCase() === 'sin nombre') return false;
        const checkOutDate = a.checkOut ? new Date(`${a.checkOut}T23:59:59`) : new Date(0);
        return checkOutDate >= today;
      })
      .sort((a, b) => new Date(a.checkIn!).getTime() - new Date(b.checkIn!).getTime());
  }, [allAccessRecords]);

  const formatGuestLabel = (guest: AccessControl) => {
    const name = guest.guestName.split(' ');
    return `${name[0]} ${name[1] ? name[1].charAt(0) + '.' : ''} | ${guest.checkIn}`;
  };

  const getGuestStatusStyle = (guest: AccessControl, isSelected: boolean) => {
    const baseClass = "flex-shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 active:scale-95 whitespace-nowrap";
    return isSelected 
      ? `${baseClass} border-[#0052FF] text-[#0052FF] bg-blue-50`
      : `${baseClass} border-slate-50 text-slate-400 bg-white hover:border-slate-200`;
  };

  // --- MANEJO DE FORMULARIO ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || 0 : value }));
  };

  const handleAccessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccessData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🟢 1. VALIDACIÓN DE CAMPOS OBLIGATORIOS (Diseño y Control)
    const newErrors: string[] = [];
    const errs = t.owner.errors as any;
    
    if (!formData.buildingName.trim()) newErrors.push(errs?.buildingName || "Nombre del edificio obligatorio");
    if (!formData.address.trim()) newErrors.push(errs?.address || "Dirección obligatoria");
    if (!formData.city.trim()) newErrors.push(errs?.city || "Ciudad obligatoria");
    if (!formData.capacity.trim() || formData.capacity === '0') newErrors.push(errs?.capacity || "Capacidad obligatoria");
    if (formData.rooms < 1) newErrors.push(errs?.rooms || "Mínimo 1 habitación");

    if (newErrors.length > 0) {
      setPropertyErrors(newErrors);
      if (activeTab !== 'PROPIEDAD') setActiveTab('PROPIEDAD');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; 
    }
    
    setPropertyErrors([]);
    setIsSaving(true); // Usamos tu estado original

    try {
      let currentPropData = { ...formData };
      
      // 🕵️ COMPROBACIÓN INTELIGENTE DE DIRECCIÓN
      // Comparamos contra 'property' (tus datos iniciales) para ver si hubo cambios reales
      const addressChanged = !property.id || 
                            currentPropData.address !== property.address || 
                            currentPropData.city !== property.city;

      const needsAIUpdate = addressChanged || !currentPropData.aiRecommendations;

      if (needsAIUpdate) {
        console.log("🤖 Generando/Actualizando Guía Turística Persistente...");
        
        // 1. Obtenemos Coordenadas (Para el mapa)
        const coords = await getCoordinates(currentPropData.address, currentPropData.city);
        
        if (coords) {
          currentPropData.location_lat = Number(coords.lat);
          currentPropData.location_lng = Number(coords.lng);
        }

        // 2. Obtenemos Recomendaciones Reales (El nuevo motor validado)
        const aiRecs = await getNearbyPlaces(currentPropData.city, currentPropData.address);
        if (aiRecs) {
          currentPropData.aiRecommendations = aiRecs;
        }
      }

      // 🟢 3. DEFINICIÓN DE finalAccess (Sincronización)
      const finalAccess: AccessControl = { 
        ...accessData, 
        propertyId: property.id,
        bookingCode: accessData.bookingCode.trim().toUpperCase()
      };

      // 🟢 4. VALIDACIÓN DE FECHAS (Tu lógica original de Reservas)
      if (finalAccess.guestName.trim() !== '' && finalAccess.guestName !== 'Sin Nombre') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();

        const timeIn = finalAccess.checkIn ? new Date(finalAccess.checkIn + 'T00:00:00').getTime() : 0;
        const timeOut = finalAccess.checkOut ? new Date(finalAccess.checkOut + 'T00:00:00').getTime() : 0;

        const newDateErrors: any = {};

        if (timeIn > 0 && timeIn < todayTime) {
          newDateErrors.checkIn = errs?.checkInPast || "La fecha no puede ser anterior a hoy"; 
        }
        if (timeOut > 0 && timeOut < todayTime) {
          newDateErrors.checkOut = errs?.checkOutPast || "La fecha no puede ser anterior a hoy";
        }
        if (timeIn > 0 && timeOut > 0 && timeOut <= timeIn) {
          newDateErrors.checkOut = errs?.dateOrder || "La salida debe ser posterior a la entrada";
        }

        if (Object.keys(newDateErrors).length > 0) {
          setDateErrors(newDateErrors);
          setActiveTab('RESERVAS');
          setIsSaving(false);
          return;
        }
      }

      setDateErrors({}); 

      // 🟢 5. ACTUALIZACIÓN DE AVATAR DEL DUEÑO
      if (ownerAvatar) {
        await supabase
          .from('owners')
          .update({ avatar_url: ownerAvatar })
          .eq('id', formData.ownerId);
      }

      // 🟢 6. GUARDADO EN SUPABASE (Usando tu función saveToSupabase)
      const realId = await saveToSupabase(currentPropData, finalAccess);
      
      if (realId) {
        currentPropData.id = realId;
        finalAccess.propertyId = realId;
        setFormData(currentPropData); 
        
        if (finalAccess.guestName.trim() !== '' && finalAccess.guestName !== 'Sin Nombre') {
          setAllAccessRecords(prev => {
            const exists = prev.find(a => a.bookingCode === finalAccess.bookingCode);
            if (exists) return prev.map(a => a.bookingCode === finalAccess.bookingCode ? finalAccess : a);
            return [...prev, finalAccess];
          });
          setIsBookingUnlocked(true);
        }
      }

      // 🟢 7. ÉXITO Y NAVEGACIÓN AUTOMÁTICA
      setSaveSuccess(true);
      onSave(currentPropData, finalAccess, ownerAvatar);

      setTimeout(() => {
        setSaveSuccess(false);
        // Navegación automática entre pestañas para flujo Luxury
        if (activeTab === 'PROPIEDAD') setActiveTab('MULTIMEDIA');
        else if (activeTab === 'MULTIMEDIA') setActiveTab('GUIAS');
        else if (activeTab === 'GUIAS') setActiveTab('RESERVAS');
        else onBack(); 
      }, 1000);

    } catch (err) {
      console.error("Error completo en sincronización:", err);
      let errorMessage = "Error desconocido";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        errorMessage = (err as any).message || JSON.stringify(err);
      }
      alert(`Error de base de datos: ${errorMessage}`);
    } finally {
      setIsSaving(false); 
    }
  };

  // Clases CSS consistentes
  const inputClass = "w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] text-base focus:bg-white focus:border-[#0052FF] outline-none transition-all font-medium";
  const labelClass = "block text-[10px] font-black uppercase text-[#64748B] tracking-[0.15em] mb-2.5 ml-1";

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 animate-in fade-in duration-700">
      {/* HEADER DINÁMICO */}
      <div className="flex justify-between items-center mb-10">
        <button onClick={onBack} className="flex items-center space-x-2 text-[#64748B] hover:text-[#0052FF] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          <span className="text-[10px] font-black uppercase tracking-widest">{t.common.back}</span>
        </button>
        
        <div className="flex items-center space-x-4">
          {saveSuccess && <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest animate-pulse">{t.common.saved}</span>}
          <button 
            onClick={handleSubmit} 
            disabled={isSaving}
            className={`w-full sm:w-auto bg-[#0052FF] text-white px-8 sm:px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/10 transition-all ${isSaving ? 'opacity-40 cursor-wait' : 'hover:bg-blue-700 active:scale-95'}`}
          >
            {/* Lógica de texto dinámica */}
            {isSaving ? '...' : (activeTab === 'RESERVAS' ? t.common.finish : t.common.next)}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-50 overflow-hidden">
        {/* NAVEGACIÓN DE PESTAÑAS */}
        <nav className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-slate-50/50">
          {[
            { id: 'PROPIEDAD', label: t.owner.tabs.config },
            { id: 'MULTIMEDIA', label: t.owner.tabs.assets },
            { id: 'GUIAS', label: t.owner.tabs.guides },
            { id: 'RESERVAS', label: t.owner.tabs.checkins }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all ${
                activeTab === tab.id ? 'border-[#0052FF] text-[#0052FF] bg-white' : 'border-transparent text-slate-300 hover:text-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <form className="p-12" onSubmit={handleSubmit}>
        {activeTab === 'PROPIEDAD' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
            {/* 🟢 2. SECCIÓN PARA VISUALIZAR LOS ERRORES DE VALIDACIÓN */}
              {propertyErrors.length > 0 && (
                <div className="md:col-span-2 bg-rose-50 border border-rose-100 p-4 rounded-2xl mb-2 animate-in fade-in slide-in-from-top-2">
                  {propertyErrors.map((err, i) => (
                    <p key={i} className="text-rose-500 text-[10px] font-black uppercase tracking-wide flex items-center mb-1 last:mb-0">
                      {/* Icono de alerta */}
                      <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {err}
                    </p>
                  ))}
                </div>
              )}
            <div className="md:col-span-2">
              <label className={labelClass}>{t.owner.form.buildingName}</label>
              <input name="buildingName" value={formData.buildingName} onChange={handleChange} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>{t.owner.form.address}</label>
              <input name="address" value={formData.address} onChange={handleChange} className={inputClass} />
            </div>
            <div><label className={labelClass}>{t.owner.form.hostName}</label><input name="hostName" value={formData.hostName} onChange={handleChange} className={inputClass} /></div>
            <div><label className={labelClass}>{t.owner.form.city}</label><input name="city" value={formData.city} onChange={handleChange} className={inputClass} /></div>
            {/* 🟢 NUEVO: Campo de WhatsApp de Soporte */}
            <div className="md:col-span-2">
              <label className={labelClass}>WhatsApp de Soporte (Ej: 573001234567)</label>
              <input 
                name="whatsappContact" 
                value={formData.whatsappContact} 
                onChange={handleChange} 
                className={inputClass} 
                placeholder="Código de país + número sin espacios ni +"
              />
            </div>
            <div className="md:col-span-2 grid grid-cols-3 gap-6">
              <div><label className={labelClass}>{t.owner.form.capacity}</label><input name="capacity" value={formData.capacity} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>{t.owner.form.rooms}</label><input type="number" name="rooms" value={formData.rooms} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>{t.owner.form.bathrooms}</label><input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleChange} className={inputClass} /></div>
            </div>

            {/* CAMPOS DE WIFI: Asegúrate de que estén aquí dentro */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 mt-4">
              <div>
                <label className={labelClass}>{t.owner.form.wifiSSID}</label>
                <input 
                  name="wifiSSID" 
                  value={formData.wifiSSID} 
                  onChange={handleChange} 
                  className={inputClass} 
                  placeholder="Nombre de la red" 
                />
              </div>
              <div>
                <label className={labelClass}>{t.owner.form.wifiPass}</label>
                <input 
                  name="wifiPass" 
                  value={formData.wifiPass} 
                  onChange={handleChange} 
                  className={inputClass + " font-mono"} 
                  placeholder="Contraseña" 
                />
              </div>
            </div>
          </div>
          )}

          {activeTab === 'RESERVAS' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex items-center space-x-4 overflow-x-auto pb-4 no-scrollbar">
                <button 
                  type="button" 
                  onClick={() => setAccessData({ id: `ac_${Date.now()}`, propertyId: property.id, guestName: '', checkIn: '', checkOut: '', bookingCode: '', doorCode: '', checkinStatus: false, issuedAt: null, registrationDate: null })}
                  className="px-6 py-3 bg-[#0052FF] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                >
                  + {t.owner.form.newGuest}
                </button>
                {activeGuests.map(g => (
                  <button key={g.id} type="button" onClick={() => setAccessData(g)} className={getGuestStatusStyle(g, accessData.id === g.id)}>
                    {formatGuestLabel(g)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className={labelClass}>{t.owner.form.guestName}</label>
                  <input name="guestName" value={accessData.guestName} onChange={handleAccessChange} className={inputClass} />
                </div>

                {/* FECHA DE ENTRADA */}
                <div className="relative">
                  <label className={labelClass}>{t.owner.form.checkIn}</label>
                  <input 
                    type="date" 
                    name="checkIn" 
                    value={accessData.checkIn} 
                    onChange={handleAccessChange} 
                    className={`${inputClass} ${dateErrors.checkIn ? 'border-rose-500 bg-rose-50' : ''}`} 
                  />
                  {dateErrors.checkIn && (
                    <p className="text-rose-500 text-[9px] font-black uppercase mt-2 ml-1 animate-in fade-in slide-in-from-top-1">
                      {dateErrors.checkIn}
                    </p>
                  )}
                </div>

                {/* FECHA DE SALIDA */}
                <div className="relative">
                  <label className={labelClass}>{t.owner.form.checkOut}</label>
                  <input 
                    type="date" 
                    name="checkOut" 
                    value={accessData.checkOut} 
                    onChange={handleAccessChange} 
                    className={`${inputClass} ${dateErrors.checkOut ? 'border-rose-500 bg-rose-50' : ''}`} 
                  />
                  {dateErrors.checkOut && (
                    <p className="text-rose-500 text-[9px] font-black uppercase mt-2 ml-1 animate-in fade-in slide-in-from-top-1">
                      {dateErrors.checkOut}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>{t.owner.form.loginCode}</label>
                  <input name="bookingCode" value={accessData.bookingCode} onChange={handleAccessChange} className={inputClass + " uppercase"} />
                </div>
                
                <div>
                  <label className={labelClass}>{t.owner.form.doorCode}</label>
                  <input name="doorCode" value={accessData.doorCode} onChange={handleAccessChange} className={inputClass} />
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex justify-between items-center">
                <button type="button" onClick={handleExportHistory} className="text-[10px] font-black text-[#0052FF] uppercase tracking-widest border-b-2 border-blue-200 hover:border-[#0052FF] transition-all">
                  {t.owner.form.downloadCsv}
                </button>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  ID: {accessData.id}
                </p>
              </div>
            </div>
          )}

          {/* LAS PESTAÑAS MULTIMEDIA Y GUIAS SE MANTIENEN IGUAL QUE TU LÓGICA ORIGINAL */}
          {activeTab === 'MULTIMEDIA' && (
             <div className="space-y-12 animate-in fade-in duration-500">
                <ImageUploader 
                  label={t.owner.form.avatarLabel} 
                  currentUrl={ownerAvatar} 
                  isAvatar={true} 
                  contextName='avatar-uploader' 
                  onUploadSuccess={(url) => setOwnerAvatar(url)} 
                  onDelete={() => setOwnerAvatar('')} 
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <ImageUploader 
                    label={t.owner.form.welcomeLabel} 
                    currentUrl={formData.welcomeImageUrl} 
                    contextName='welcome-uploader' // Corregí un typo aquí ('welcomn' -> 'welcome')
                    // Usamos 'prev' para asegurar que no se mezclen los estados
                    onUploadSuccess={(url) => setFormData(prev => ({ ...prev, welcomeImageUrl: url }))} 
                    onDelete={() => setFormData(prev => ({ ...prev, welcomeImageUrl: ' ' }))} 
                  />
                   <ImageUploader 
                    label={t.owner.form.dashboardLabel} 
                    currentUrl={formData.stayImageUrl} 
                    contextName='stay-uploader'
                    // Usamos 'prev' aquí también para aislar esta actualización
                    onUploadSuccess={(url) => setFormData(prev => ({ ...prev, stayImageUrl: url }))} 
                    onDelete={() => setFormData(prev => ({ ...prev, stayImageUrl: ' ' }))} 
                  />
                </div>
             </div>
          )}

          {activeTab === 'GUIAS' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <textarea name="rules" value={formData.rules} onChange={handleChange} rows={5} className={inputClass} placeholder={t.owner.form.rules} />
               <textarea name="guides" value={formData.guides} onChange={handleChange} rows={5} className={inputClass} placeholder={t.owner.form.manual} />
               <textarea name="checkoutInstructions" value={formData.checkoutInstructions} onChange={handleChange} rows={5} className={inputClass} placeholder={t.owner.form.checkout} />
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default PropertyForm;