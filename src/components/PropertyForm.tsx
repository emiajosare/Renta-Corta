import React, { useState, useEffect, useMemo } from 'react';
import type { PropertySettings, AccessControl, Owner, Language } from '../types';
import { STORAGE_KEYS } from '../constants';
import { translations } from '../translations';
import { getNearbyPlaces } from '../services/geminiService';
import { getCoordinates } from '../services/geocodingService'; 
import { supabase } from '../lib/supabaseClient';
import ImageUploader from './ImageUploader';

interface PropertyFormProps {
  property: PropertySettings;
  onSave: (prop: PropertySettings, access: AccessControl, newAvatarUrl?: string) => void;
  onBack: () => void;
  language: Language;
  onToggleLanguage: () => void;
  isFounder?: boolean;
}

type Tab = 'PROPIEDAD' | 'MULTIMEDIA' | 'RESERVAS' | 'GUIAS';

const PropertyForm: React.FC<PropertyFormProps> = ({ property, onSave, onBack, language, onToggleLanguage, isFounder }) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<Tab>('PROPIEDAD');
  const [formData, setFormData] = useState<PropertySettings>(property);
  const [ownerAvatar, setOwnerAvatar] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // 🟢 ESTADOS PARA EL ASISTENTE DE VIDEO CONTEXTUAL NATIVO
  const [showVideoModal, setShowVideoModal] = useState(false);
  
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
    registrationDate: null,
    doorCodeDuration: undefined
  });

  // 🟢 MAPEO DINÁMICO DE VIDEOS (Mutan automáticamente según la pestaña real activa)
  const videoMapping: Record<Tab, { title: string; src: string }> = {
    PROPIEDAD: { title: "Configuración de Inmueble y WiFi", src: "/tutorial_config.mp4" },
    MULTIMEDIA: { title: "Galería Multimedia Exclusiva", src: "/tutorial_activos.mp4" },
    GUIAS: { title: "Manuales de Confort y Reglas", src: "/tutorial_reglas.mp4" },
    RESERVAS: { title: "Gestión de Check-Ins y Reservas", src: "/tutorial_reservas.mp4" }
  };

  const currentVideo = videoMapping[activeTab];

  // --- LÓGICA DEL LINK DE INVITACIÓN ---
  const shortId = formData.id?.split('-')[0] || 'access'; 
  const invitationLink = `${window.location.origin}/stay/${shortId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitationLink);
    alert(language === 'es' ? "¡Enlace copiado! Envíalo a tu huésped." : "Link copied! Send it to your guest.");
  };

  // --- CARGA INICIAL DESDE NUBE (Prioridad Supabase) ---
  useEffect(() => {
    const loadInitialData = async () => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(property.id);
      
      if (!isUUID) {
        console.log("ID temporal detectado, saltando consulta a Supabase");
        return; 
      }
      
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
      const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
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

      if (isUUID(propData.id)) {
        propertyPayload.id = propData.id;
      }

      const { data: savedProp, error: propError } = await supabase
        .from('properties')
        .upsert(propertyPayload, { onConflict: 'id' }) 
        .select()
        .single();

      if (propError) throw propError;

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
          registration_date: guestData.registrationDate || new Date().toISOString(),
          door_code_duration: guestData.doorCodeDuration || null
        };

        const { error: guestError } = await supabase
          .from('access_control')
          .upsert(guestPayload, { onConflict: 'booking_code' });

        if (guestError) throw guestError;
      }

      return realPropertyId;
    } catch (err) {
      console.error("Error en sincronización:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Error de base de datos: ${errorMessage}`);
      return null;
    }
  };

  // --- FUNCIÓN ÚNICA DE EXPORTACIÓN ---
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
    return allAccessRecords
      .filter(a => {
        if (!a.guestName || a.guestName.trim() === '' || a.guestName.toLowerCase() === 'sin nombre') return false;
        return true;
      })
      .sort((a, b) => new Date(a.checkIn!).getTime() - new Date(b.checkIn!).getTime());
  }, [allAccessRecords]);

  const isExpired = (guest: AccessControl) => {
    if (!guest.checkOut) return false;
    const checkOutDate = new Date(`${guest.checkOut}T23:59:59`);
    const oneDayAfter = new Date(checkOutDate.getTime() + 24 * 60 * 60 * 1000);
    return new Date() >= oneDayAfter;
  };

  const formatGuestLabel = (guest: AccessControl) => {
    const name = guest.guestName.split(' ');
    return `${name[0]} ${name[1] ? name[1].charAt(0) + '.' : ''} | ${guest.checkIn}`;
  };

  const getGuestStatusStyle = (guest: AccessControl, isSelected: boolean) => {
    const baseClass = "flex-shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 active:scale-95 whitespace-nowrap";
    if (isExpired(guest)) {
      return isSelected
        ? `${baseClass} border-rose-400 text-rose-600 bg-rose-100`
        : `${baseClass} border-rose-200 text-rose-400 bg-rose-50 hover:border-rose-400`;
    }
    return isSelected
      ? `${baseClass} border-[#0052FF] text-[#0052FF] bg-blue-50`
      : `${baseClass} border-slate-50 text-slate-400 bg-white hover:border-slate-200`;
  };

  const handleDeleteGuest = async (guestId: string, guestName: string) => {
    const confirmed = window.confirm(`¿Eliminar la reserva de ${guestName}?`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('access_control').delete().eq('id', guestId);
      if (error) throw error;
      setAllAccessRecords(prev => prev.filter(a => a.id !== guestId));
      if (accessData.id === guestId) {
        setAccessData({ id: `ac_${Date.now()}`, propertyId: property.id, guestName: '', checkIn: '', checkOut: '', bookingCode: '', doorCode: '', checkinStatus: false, issuedAt: null, registrationDate: null, doorCodeDuration: undefined });
      }
    } catch (err) {
      alert('No se pudo eliminar la reserva.');
    }
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
    setIsSaving(true); 

    try {
      let currentPropData = { ...formData };
      const addressChanged = !property.id || 
                            currentPropData.address !== property.address || 
                            currentPropData.city !== property.city;

      const needsAIUpdate = addressChanged || !currentPropData.aiRecommendations;

      if (needsAIUpdate) {
        console.log("🤖 Generando/Actualizando Guía Turística Persistente...");
        const coords = await getCoordinates(currentPropData.address, currentPropData.city);
        if (coords) {
          currentPropData.location_lat = Number(coords.lat);
          currentPropData.location_lng = Number(coords.lng);
        }

        const aiRecs = await getNearbyPlaces(currentPropData.city, currentPropData.address);
        if (aiRecs) {
          currentPropData.aiRecommendations = aiRecs;
          currentPropData.nearbyPlaces = aiRecs; 
          console.log("✅ Recomendaciones inyectadas en el objeto de la propiedad");
        }
      }

      const finalAccess: AccessControl = { 
        ...accessData, 
        propertyId: property.id,
        bookingCode: accessData.bookingCode.trim().toUpperCase()
      };

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

      if (ownerAvatar) {
        await supabase
          .from('owners')
          .update({ avatar_url: ownerAvatar })
          .eq('id', formData.ownerId);
      }

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

      setSaveSuccess(true);
      onSave(currentPropData, finalAccess, ownerAvatar);

      setTimeout(() => {
        setSaveSuccess(false);
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
      }
      alert(`Error de base de datos: ${errorMessage}`);
    } finally {
      setIsSaving(false); 
    }
  };

  const inputClass = "w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] text-base focus:bg-white focus:border-[#0052FF] outline-none transition-all font-medium";
  const labelClass = "block text-[10px] font-black uppercase text-[#64748B] tracking-[0.15em] mb-2.5 ml-1";

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 animate-in fade-in duration-700">
      
      {/* HEADER PRINCIPAL DE ACCIONES */}
      <div className="flex justify-between items-center mb-10">
        <button onClick={onBack} className="flex items-center space-x-2 text-[#64748B] hover:text-[#0052FF] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          <span className="text-[10px] font-black uppercase tracking-widest">{t.common.back}</span>
        </button>
        
        {/* 🟢 ACCIONES EN HEAD DE PANTALLA: Aquí incluimos el botón contextual premium de ayuda */}
        <div className="flex items-center space-x-4">
          
          {/* BOTÓN CONTEXTUAL DE VIDEO (Sabe exactamente qué pestaña estás editando) */}
          <button 
            type="button"
            onClick={() => setShowVideoModal(true)}
            className="flex items-center gap-2 px-5 py-3.5 bg-[#C9A84C]/10 border border-[#C9A84C]/40 rounded-2xl text-[#C9A84C] text-[10px] font-black uppercase tracking-widest hover:bg-[#C9A84C]/20 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(201,168,76,0.1)] group"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse group-hover:bg-emerald-400"></span>
            <span>▶ Guía de {activeTab}</span>
          </button>

          {saveSuccess && <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest animate-pulse">{t.common.saved}</span>}
          
          <button 
            onClick={handleSubmit} 
            disabled={isSaving}
            className={`w-full sm:w-auto bg-[#0052FF] text-white px-8 sm:px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/10 transition-all ${isSaving ? 'opacity-40 cursor-wait' : 'hover:bg-blue-700 active:scale-95'}`}
          >
            {isSaving ? '...' : (activeTab === 'RESERVAS' ? t.common.finish : t.common.next)}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-50 overflow-hidden">
        
        {/* NAVEGACIÓN DE PESTAÑAS REALES DE LA PLATAFORMA */}
        <nav className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-slate-50/50">
          {[
            { id: 'PROPIEDAD', label: t.owner.tabs.config },
            { id: 'MULTIMEDIA', label: t.owner.tabs.assets },
            { id: 'GUIAS', label: t.owner.tabs.guides },
            { id: 'RESERVAS', label: t.owner.tabs.checkins }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as Tab);
                setDateErrors({}); // Limpiamos errores al cambiar de contexto
              }}
              className={`px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all ${
                activeTab === tab.id ? 'border-[#0052FF] text-[#0052FF] bg-white' : 'border-transparent text-slate-300 hover:text-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <form className="p-12" onSubmit={handleSubmit}>
          
          {/* --- BLOQUE: CONFIGURACIÓN DE PROPIEDAD --- */}
          {activeTab === 'PROPIEDAD' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
              {propertyErrors.length > 0 && (
                <div className="md:col-span-2 bg-rose-50 border border-rose-100 p-4 rounded-2xl mb-2 animate-in fade-in slide-in-from-top-2">
                  {propertyErrors.map((err, i) => (
                    <p key={i} className="text-rose-500 text-[10px] font-black uppercase tracking-wide flex items-center mb-1 last:mb-0">
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
              
              <div className="md:col-span-2">
                <label className={labelClass}>WhatsApp de Soporte (Ej: 573001234567)</label>
                <input name="whatsappContact" value={formData.whatsappContact} onChange={handleChange} className={inputClass} placeholder="Código de país + número sin espacios ni +" />
              </div>
              
              <div className="md:col-span-2 grid grid-cols-3 gap-6">
                <div><label className={labelClass}>{t.owner.form.capacity}</label><input name="capacity" value={formData.capacity} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}>{t.owner.form.rooms}</label><input type="number" name="rooms" value={formData.rooms} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}>{t.owner.form.bathrooms}</label><input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleChange} className={inputClass} /></div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 mt-4">
                <div>
                  <label className={labelClass}>{t.owner.form.wifiSSID}</label>
                  <input name="wifiSSID" value={formData.wifiSSID} onChange={handleChange} className={inputClass} placeholder="Nombre de la red" />
                </div>
                <div>
                  <label className={labelClass}>{t.owner.form.wifiPass}</label>
                  <input name="wifiPass" value={formData.wifiPass} onChange={handleChange} className={inputClass + " font-mono"} placeholder="Contraseña" />
                </div>
              </div>
            </div>
          )}

          {/* --- BLOQUE: RESERVAS / CHECK-INS --- */}
          {activeTab === 'RESERVAS' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex items-center space-x-4 overflow-x-auto pb-4 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setAccessData({ id: `ac_${Date.now()}`, propertyId: property.id, guestName: '', checkIn: '', checkOut: '', bookingCode: '', doorCode: '', checkinStatus: false, issuedAt: null, registrationDate: null, doorCodeDuration: undefined })}
                  className="px-6 py-3 bg-[#0052FF] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex-shrink-0"
                >
                  + {t.owner.form.newGuest}
                </button>
                {activeGuests.map(g => (
                  <div key={g.id} className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onClick={() => setAccessData(g)} className={getGuestStatusStyle(g, accessData.id === g.id)}>
                      {formatGuestLabel(g)}
                      {isExpired(g) && <span className="ml-2">🔴</span>}
                    </button>
                    {isExpired(g) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteGuest(g.id, g.guestName)}
                        className="w-8 h-8 flex items-center justify-center text-rose-300 hover:text-rose-600 transition-colors"
                        title="Eliminar reserva"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className={labelClass}>{t.owner.form.guestName}</label>
                  <input name="guestName" value={accessData.guestName} onChange={handleAccessChange} className={inputClass} />
                </div>

                <div className="relative">
                  <label className={labelClass}>{t.owner.form.checkIn}</label>
                  <input type="date" name="checkIn" value={accessData.checkIn} onChange={handleAccessChange} className={`${inputClass} ${dateErrors.checkIn ? 'border-rose-500 bg-rose-50' : ''}`} />
                  {dateErrors.checkIn && <p className="text-rose-500 text-[9px] font-black uppercase mt-2 ml-1 animate-in fade-in">{dateErrors.checkIn}</p>}
                </div>

                <div className="relative">
                  <label className={labelClass}>{t.owner.form.checkOut}</label>
                  <input type="date" name="checkOut" value={accessData.checkOut} onChange={handleAccessChange} className={`${inputClass} ${dateErrors.checkOut ? 'border-rose-500 bg-rose-50' : ''}`} />
                  {dateErrors.checkOut && <p className="text-rose-500 text-[9px] font-black uppercase mt-2 ml-1 animate-in fade-in">{dateErrors.checkOut}</p>}
                </div>

                <div>
                  <label className={labelClass}>{t.owner.form.loginCode}</label>
                  <input name="bookingCode" value={accessData.bookingCode} onChange={handleAccessChange} className={inputClass + " uppercase"} />
                </div>

                <div>
                  <label className={labelClass}>{t.owner.form.doorCode}</label>
                  <input name="doorCode" value={accessData.doorCode} onChange={handleAccessChange} className={inputClass} />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                    <label className={labelClass}>⏱️ Duración del Código Puerta (días)</label>
                    <div className="flex items-center gap-4 mt-2">
                      <input
                        type="number"
                        min={1}
                        max={
                          accessData.checkIn && accessData.checkOut
                            ? Math.max(1, Math.ceil((new Date(accessData.checkOut).getTime() - new Date(accessData.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
                            : 365
                        }
                        value={accessData.doorCodeDuration || ''}
                        onChange={(e) => setAccessData(prev => ({
                          ...prev,
                          doorCodeDuration: e.target.value ? parseInt(e.target.value) : undefined
                        }))}
                        placeholder="Días"
                        className={`${inputClass} max-w-[140px] text-center font-mono`}
                      />
                      <div className="flex-1">
                        <p className="text-[11px] font-bold text-slate-500">
                          {accessData.doorCodeDuration
                            ? `El código expira después de ${accessData.doorCodeDuration} día${accessData.doorCodeDuration > 1 ? 's' : ''} desde el check-in`
                            : 'Sin configurar → expira a los 30 minutos del check-in'}
                        </p>
                        {accessData.checkIn && accessData.checkOut && (
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">
                            Máximo: {Math.ceil((new Date(accessData.checkOut).getTime() - new Date(accessData.checkIn).getTime()) / (1000 * 60 * 60 * 24))} días (hasta el checkout)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-center">
                    <label className="block text-[10px] font-black uppercase text-[#C9A84C] tracking-[0.2em] mb-3 ml-1">
                      Enlace de Invitación Deluxe
                    </label>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                      <div className="flex-1 px-3 py-2 bg-white rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 truncate">
                        <span className="text-[#0052FF]/50">hostflow.app/</span>stay/{shortId}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="p-3 bg-black text-[#C9A84C] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-3 ml-1 font-medium">
                      ✨ Este link identifica automáticamente la propiedad para tu huésped.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex justify-between items-center">
                <button 
                  type="button" 
                  onClick={isFounder ? undefined : handleExportHistory} 
                  disabled={isFounder}
                  title={isFounder ? "Función Basico: Actualiza tu plan para descargar historiales en CSV." : ""}
                  className={`text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                    isFounder 
                      ? 'text-slate-400 border-slate-200 opacity-50 cursor-not-allowed' 
                      : 'text-[#0052FF] border-blue-200 hover:border-[#0052FF]'
                  }`}
                >
                  {t.owner.form.downloadCsv} {isFounder && <span className="ml-1 text-[8px] bg-slate-200 px-1 py-0.5 rounded text-slate-500">BASICO</span>}
                </button>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  ID: {accessData.id}
                </p>
              </div>
            </div>
          )}

          {/* --- BLOQUE: MULTIMEDIA --- */}
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
                    contextName='welcome-uploader' 
                    onUploadSuccess={(url) => setFormData(prev => ({ ...prev, welcomeImageUrl: url }))} 
                    onDelete={() => setFormData(prev => ({ ...prev, welcomeImageUrl: ' ' }))} 
                  />
                  <ImageUploader 
                    label={t.owner.form.dashboardLabel} 
                    currentUrl={formData.stayImageUrl} 
                    contextName='stay-uploader'
                    onUploadSuccess={(url) => setFormData(prev => ({ ...prev, stayImageUrl: url }))} 
                    onDelete={() => setFormData(prev => ({ ...prev, stayImageUrl: ' ' }))} 
                  />
                </div>
             </div>
          )}

          {/* --- BLOQUE: GUIAS Y TEXTOS OPERATIVOS --- */}
          {activeTab === 'GUIAS' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <textarea name="rules" value={formData.rules} onChange={handleChange} rows={5} className={inputClass} placeholder={t.owner.form.rules} />
               <textarea name="guides" value={formData.guides} onChange={handleChange} rows={5} className={inputClass} placeholder={t.owner.form.manual} />
               <textarea name="checkoutInstructions" value={formData.checkoutInstructions} onChange={handleChange} rows={5} className={inputClass} placeholder={t.owner.form.checkout} />
            </div>
          )}
        </form>
      </div>

      {/* 🟢 MODAL NATIVO GLOBAL DEL VIDEO ASISTENTE CON KEY DE REFRESCO DE VISTA */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#111] border border-white/10 p-6 rounded-[2.5rem] max-w-2xl w-full relative shadow-[0_0_50px_rgba(201,168,76,0.2)] animate-in zoom-in-95 duration-300">
            
            <button 
              type="button" 
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full transition-colors"
            >
              Cerrar [X]
            </button>
            
            <h3 className="text-xl font-bold mb-4 text-[#C9A84C] italic font-serif">
              {currentVideo.title}
            </h3>
            
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-inner">
              <video 
                key={currentVideo.src} // ⚡ CLAVE DE INGENIERÍA: Fuerza a React a refrescar e instanciar el nuevo archivo de video al cambiar de pestaña
                className="w-full h-full object-cover"
                src={currentVideo.src} 
                controls
                autoPlay
              />
            </div>
            
            <p className="text-white/40 text-xs mt-4 text-center">
              Estás viendo el video de soporte operativo para el módulo actual de tu panel de control.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyForm;