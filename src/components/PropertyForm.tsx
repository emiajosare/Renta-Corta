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
  
  // 🟢 CONTROL DE MODAL DE VIDEO Y EL NUEVO INTERCEPTOR DE RETENCIÓN
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isReturnTutorialActive, setIsReturnTutorialActive] = useState(false); // Triggers 'tutorial_anfitrion.mp4'
  
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

  // 🟢 MAPEO DINÁMICO DE VIDEOS CONTEXTUALES
  const videoMapping: Record<Tab, { title: string; src: string }> = {
    PROPIEDAD: { title: "Configuración de Inmueble y WiFi", src: "/tutorial_config.mp4" },
    MULTIMEDIA: { title: "Galería Multimedia Exclusiva", src: "/tutorial_activos.mp4" },
    GUIAS: { title: "Manuales de Confort y Reglas", src: "/tutorial_reglas.mp4" },
    RESERVAS: { title: "Gestión de Check-Ins y Reservas", src: "/tutorial_reservas.mp4" }
  };

  // Si la intercepción de salida está activa, forzamos el render del video instructivo de anfitrión
  const currentVideo = isReturnTutorialActive 
    ? { title: "🚨 CRÍTICO: Cómo volver a ingresar a tu Panel de Anfitrión", src: "/tutorial_anfitrion.mp4" }
    : videoMapping[activeTab];

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
      if (!isUUID) return; 
      
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
      return savedProp.id;
    } catch (err) {
      console.error("Error en sincronización:", err);
      return null;
    }
  };

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
      if (!history || history.length === 0) return alert("No hay datos para exportar");

      const headers = ["Huésped", "Entrada", "Salida", "Código Reserva", "Puerta", "Estado"];
      const csvRows = [
        headers.join(','),
        ...history.map(row => [`"${row.guest_name}"`, row.check_in, row.check_out, row.booking_code, row.door_code, row.checkin_status ? 'Completado' : 'Pendiente'].join(','))
      ];

      const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Reporte_${property.buildingName.replace(/\s+/g, '_')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeGuests = useMemo(() => {
    return allAccessRecords
      .filter(a => a.guestName && a.guestName.trim() !== '' && a.guestName.toLowerCase() !== 'sin nombre')
      .sort((a, b) => new Date(a.checkIn!).getTime() - new Date(b.checkIn!).getTime());
  }, [allAccessRecords]);

  const isExpired = (guest: AccessControl) => {
    if (!guest.checkOut) return false;
    const checkOutDate = new Date(`${guest.checkOut}T23:59:59`);
    return new Date() >= new Date(checkOutDate.getTime() + 24 * 60 * 60 * 1000);
  };

  const formatGuestLabel = (guest: AccessControl) => {
    const name = guest.guestName.split(' ');
    return `${name[0]} ${name[1] ? name[1].charAt(0) + '.' : ''} | ${guest.checkIn}`;
  };

  const getGuestStatusStyle = (guest: AccessControl, isSelected: boolean) => {
    const baseClass = "flex-shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 active:scale-95 whitespace-nowrap";
    if (isExpired(guest)) {
      return isSelected ? `${baseClass} border-rose-400 text-rose-600 bg-rose-100` : `${baseClass} border-rose-200 text-rose-400 bg-rose-50 hover:border-rose-400`;
    }
    return isSelected ? `${baseClass} border-[#0052FF] text-[#0052FF] bg-blue-50` : `${baseClass} border-slate-50 text-slate-400 bg-white hover:border-slate-200`;
  };

  const handleDeleteGuest = async (guestId: string, guestName: string) => {
    if (!window.confirm(`¿Eliminar la reserva de ${guestName}?`)) return;
    try {
      await supabase.from('access_control').delete().eq('id', guestId);
      setAllAccessRecords(prev => prev.filter(a => a.id !== guestId));
    } catch (err) {
      alert('No se pudo eliminar.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || 0 : value }));
  };

  const handleAccessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccessData(prev => ({ ...prev, [name]: value }));
  };

  // 🟢 CORE LOGIC MODIFICADA: INTERCEPCIÓN EN EL SUBMIT FINAL
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: string[] = [];
    if (!formData.buildingName.trim()) newErrors.push("Nombre del edificio obligatorio");
    if (!formData.address.trim()) newErrors.push("Dirección obligatoria");
    if (!formData.city.trim()) newErrors.push("Ciudad obligatoria");

    if (newErrors.length > 0) {
      setPropertyErrors(newErrors);
      if (activeTab !== 'PROPIEDAD') setActiveTab('PROPIEDAD');
      return; 
    }
    
    setPropertyErrors([]);
    setIsSaving(true); 

    try {
      let currentPropData = { ...formData };
      const finalAccess: AccessControl = { 
        ...accessData, 
        propertyId: property.id,
        bookingCode: accessData.bookingCode.trim().toUpperCase()
      };

      if (ownerAvatar) {
        await supabase.from('owners').update({ avatar_url: ownerAvatar }).eq('id', formData.ownerId);
      }

      const realId = await saveToSupabase(currentPropData, finalAccess);
      if (realId) {
        currentPropData.id = realId;
        setFormData(currentPropData); 
      }

      setSaveSuccess(true);
      onSave(currentPropData, finalAccess, ownerAvatar);

      setTimeout(() => {
        setSaveSuccess(false);
        if (activeTab === 'PROPIEDAD') setActiveTab('MULTIMEDIA');
        else if (activeTab === 'MULTIMEDIA') setActiveTab('GUIAS');
        else if (activeTab === 'GUIAS') setActiveTab('RESERVAS');
        else {
          // 🔥 EN LUGAR DE SALIR DIRECTO DEL MODULO RESERVAS: Interceptamos con el video tutorial crítico
          setIsReturnTutorialActive(true);
          setShowVideoModal(true);
        }
      }, 1000);

    } catch (err) {
      console.error(err);
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
        
        <div className="flex items-center space-x-4">
          
          {/* BOTÓN CONTEXTUAL DE VIDEO ORIGINAL */}
          <button 
            type="button"
            onClick={() => {
              setIsReturnTutorialActive(false); // Asegura que abre el video normal de la pestaña
              setShowVideoModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3.5 bg-[#C9A84C]/10 border border-[#C9A84C]/40 rounded-2xl text-[#C9A84C] text-[10px] font-black uppercase tracking-widest hover:bg-[#C9A84C]/20 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(201,168,76,0.1)] group"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>▶ Guía de {activeTab}</span>
          </button>

          {/* 🔴 NUEVO BOTÓN LLAMATIVO EXCLUSIVO DE RETENCIÓN (Solo visible en la pestaña final de RESERVAS) */}
          {activeTab === 'RESERVAS' && (
            <button 
              type="button"
              onClick={() => {
                setIsReturnTutorialActive(true);
                setShowVideoModal(true);
              }}
              className="flex items-center gap-2 px-5 py-3.5 bg-amber-500 text-black border border-amber-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all hover:scale-[1.02] shadow-[0_0_25px_rgba(245,158,11,0.35)] animate-bounce"
            >
              <span>⚠️ ¡MIRA ESTO ANTES DE SALIR!</span>
            </button>
          )}

          {saveSuccess && <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest animate-pulse">{t.common.saved}</span>}
          
          <button 
            onClick={handleSubmit} 
            disabled={isSaving}
            className={`w-full sm:w-auto bg-[#0052FF] text-white px-8 sm:px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isSaving ? 'opacity-40' : 'hover:bg-blue-700 active:scale-95'}`}
          >
            {isSaving ? '...' : (activeTab === 'RESERVAS' ? t.common.finish : t.common.next)}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-50 overflow-hidden">
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
                setIsReturnTutorialActive(false);
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
          {activeTab === 'PROPIEDAD' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
              {propertyErrors.length > 0 && (
                <div className="md:col-span-2 bg-rose-50 border border-rose-100 p-4 rounded-2xl mb-2">
                  {propertyErrors.map((err, i) => <p key={i} className="text-rose-500 text-[10px] font-black uppercase tracking-wide flex items-center mb-1">{err}</p>)}
                </div>
              )}
              <div className="md:col-span-2"><input name="buildingName" value={formData.buildingName} onChange={handleChange} className={inputClass} placeholder="Edificio" /></div>
              <div className="md:col-span-2"><input name="address" value={formData.address} onChange={handleChange} className={inputClass} placeholder="Dirección" /></div>
              <div><input name="hostName" value={formData.hostName} onChange={handleChange} className={inputClass} placeholder="Anfitrión" /></div>
              <div><input name="city" value={formData.city} onChange={handleChange} className={inputClass} placeholder="Ciudad" /></div>
              <div className="md:col-span-2"><input name="whatsappContact" value={formData.whatsappContact} onChange={handleChange} className={inputClass} placeholder="WhatsApp" /></div>
              <div className="md:col-span-2 grid grid-cols-3 gap-6">
                <input name="capacity" value={formData.capacity} onChange={handleChange} className={inputClass} placeholder="Capacidad" />
                <input type="number" name="rooms" value={formData.rooms} onChange={handleChange} className={inputClass} />
                <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleChange} className={inputClass} />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 mt-4">
                <input name="wifiSSID" value={formData.wifiSSID} onChange={handleChange} className={inputClass} placeholder="WiFi SSID" />
                <input name="wifiPass" value={formData.wifiPass} onChange={handleChange} className={inputClass} placeholder="WiFi Pass" />
              </div>
            </div>
          )}

          {activeTab === 'RESERVAS' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex items-center space-x-4 overflow-x-auto pb-4 no-scrollbar">
                <button type="button" onClick={() => setAccessData({ id: `ac_${Date.now()}`, propertyId: property.id, guestName: '', checkIn: '', checkOut: '', bookingCode: '', doorCode: '', checkinStatus: false, issuedAt: null, registrationDate: null, doorCodeDuration: undefined })} className="px-6 py-3 bg-[#0052FF] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex-shrink-0">+ {t.owner.form.newGuest}</button>
                {activeGuests.map(g => (
                  <button key={g.id} type="button" onClick={() => setAccessData(g)} className={getGuestStatusStyle(g, accessData.id === g.id)}>{formatGuestLabel(g)}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2"><input name="guestName" value={accessData.guestName} onChange={handleAccessChange} className={inputClass} placeholder="Nombre Huésped" /></div>
                <input type="date" name="checkIn" value={accessData.checkIn} onChange={handleAccessChange} className={inputClass} />
                <input type="date" name="checkOut" value={accessData.checkOut} onChange={handleAccessChange} className={inputClass} />
                <input name="bookingCode" value={accessData.bookingCode} onChange={handleAccessChange} className={inputClass + " uppercase"} placeholder="Código Reserva" />
                <input name="doorCode" value={accessData.doorCode} onChange={handleAccessChange} className={inputClass} placeholder="Código Puerta" />
                
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-center">
                    <label className="block text-[10px] font-black uppercase text-[#C9A84C] tracking-[0.2em] mb-3 ml-1">Enlace de Invitación Deluxe</label>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                      <div className="flex-1 px-3 py-2 bg-white rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 truncate"><span className="text-[#0052FF]/50">hostflow.app/</span>stay/{shortId}</div>
                      <button type="button" onClick={handleCopyLink} className="p-3 bg-black text-[#C9A84C] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg">❐</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'MULTIMEDIA' && (
             <div className="space-y-12 animate-in fade-in duration-500">
                <ImageUploader label={t.owner.form.avatarLabel} currentUrl={ownerAvatar} isAvatar={true} contextName='avatar-uploader' onUploadSuccess={(url) => setOwnerAvatar(url)} onDelete={() => setOwnerAvatar('')} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <ImageUploader label={t.owner.form.welcomeLabel} currentUrl={formData.welcomeImageUrl} contextName='welcome-uploader' onUploadSuccess={(url) => setFormData(prev => ({ ...prev, welcomeImageUrl: url }))} onDelete={() => setFormData(prev => ({ ...prev, welcomeImageUrl: ' ' }))} />
                  <ImageUploader label={t.owner.form.dashboardLabel} currentUrl={formData.stayImageUrl} contextName='stay-uploader' onUploadSuccess={(url) => setFormData(prev => ({ ...prev, stayImageUrl: url }))} onDelete={() => setFormData(prev => ({ ...prev, stayImageUrl: ' ' }))} />
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

      {/* 🟢 MODAL ASISTENTE GLOBAL DE VIDEO ADAPTATIVO */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`bg-[#111] border p-6 rounded-[2.5rem] max-w-2xl w-full relative shadow-2xl transition-all duration-500 ${isReturnTutorialActive ? 'border-amber-500 shadow-[0_0_60px_rgba(245,158,11,0.25)]' : 'border-white/10 shadow-[0_0_50px_rgba(201,168,76,0.15)]'}`}>

            {/* Encabezado en fila: título a la izquierda, botón de cierre a la derecha (sin superponerse) */}
            <div className="flex items-start justify-between gap-4 mb-4">
              {/* Título de Alerta si es Video de Retorno */}
              <h3 className={`text-xl font-bold italic font-serif transition-colors ${isReturnTutorialActive ? 'text-amber-500 animate-pulse' : 'text-[#C9A84C]'}`}>
                {currentVideo.title}
              </h3>

              {/* Botón Dinámico de Cierre */}
              <button
                type="button"
                onClick={() => {
                  setShowVideoModal(false);
                  if (isReturnTutorialActive) {
                    setIsReturnTutorialActive(false);
                    onBack(); // Si era la intercepción de salida, ejecuta finalmente la salida real al panel
                  }
                }}
                className={`relative z-10 shrink-0 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${isReturnTutorialActive ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white/5 text-white/40 hover:text-white'}`}
              >
                {isReturnTutorialActive ? "¡ENTENDIDO! IR AL PANEL DE CONTROL [X]" : "Cerrar [X]"}
              </button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-inner">
              <video 
                key={currentVideo.src} // Fuerza el renderizado inmediato del nuevo archivo de video mp4
                className="w-full h-full object-cover"
                src={currentVideo.src} 
                controls
                autoPlay
              />
            </div>
            
            <p className="text-white/40 text-xs mt-4 text-center">
              {isReturnTutorialActive 
                ? "Este video contiene las credenciales de acceso técnico y el método seguro de re-ingreso. Míralo por completo antes de abandonar."
                : "Estás viendo el video de soporte operativo para el módulo actual de tu panel de control."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyForm;