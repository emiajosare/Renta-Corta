
import React, { useState, useEffect, useMemo } from 'react';
import type { PropertySettings, AccessControl, Owner, Language } from '../types';
import { STORAGE_KEYS } from '../constants';
import { translations } from '../translations';
import { getNearbyPlaces } from '../services/geminiService';
import ImageUploader from './ImageUploader';

interface PropertyFormProps {
  property: PropertySettings;
  onSave: (prop: PropertySettings, access: AccessControl) => void;
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

  useEffect(() => {
    const rawAccess = localStorage.getItem(STORAGE_KEYS.ACCESS_CONTROL);
    if (rawAccess) {
      const records: AccessControl[] = JSON.parse(rawAccess);
      setAllAccessRecords(records);
      const hasHistory = records.some(a => a.propertyId === property.id);
      if (hasHistory) setIsBookingUnlocked(true);
    }

    const rawOwners = localStorage.getItem(STORAGE_KEYS.OWNERS);
    if (rawOwners) {
      const owners: Owner[] = JSON.parse(rawOwners);
      const owner = owners.find(o => o.id === property.ownerId);
      if (owner?.avatarUrl) setOwnerAvatar(owner.avatarUrl);
    }
  }, [property.id, property.ownerId]);

  useEffect(() => {
    setDateErrors({});
    setPropertyErrors([]);
  }, [accessData.id]);

  const activeGuests = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    return allAccessRecords
      .filter(a => {
        if (a.propertyId !== property.id) return false;
        if (!a.guestName || a.guestName.trim() === '' || a.guestName.toLowerCase() === 'sin nombre') return false;
        const checkOutDate = a.checkOut ? new Date(`${a.checkOut}T12:00:00`) : new Date(0);
        return checkOutDate >= today;
      })
      .sort((a, b) => {
        const dateA = a.checkIn ? new Date(`${a.checkIn}T12:00:00`).getTime() : 0;
        const dateB = b.checkIn ? new Date(`${b.checkIn}T12:00:00`).getTime() : 0;
        return dateA - dateB;
      });
  }, [allAccessRecords, property.id]);

  const formatGuestLabel = (guest: AccessControl) => {
    try {
      const nameParts = guest.guestName.split(' ');
      const firstName = nameParts[0];
      const lastInitial = nameParts.length > 1 ? `${nameParts[1].charAt(0)}.` : '';
      const cleanName = `${firstName} ${lastInitial}`.trim();
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      let dateRange = '';
      if (guest.checkIn && guest.checkOut) {
        const inDate = new Date(`${guest.checkIn}T12:00:00`);
        const dayIn = inDate.getDate();
        const dayOut = new Date(`${guest.checkOut}T12:00:00`).getDate();
        const month = months[inDate.getMonth()];
        dateRange = `| ${dayIn}-${dayOut} ${month}`;
      }
      return `${cleanName} ${dateRange}`;
    } catch (e) { return guest.guestName; }
  };

  const getGuestStatusStyle = (guest: AccessControl, isSelected: boolean) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      let checkInDate = guest.checkIn ? new Date(`${guest.checkIn}T00:00:00`) : null;
      let checkOutDate = guest.checkOut ? new Date(`${guest.checkOut}T00:00:00`) : null;
      let isStayActive = checkInDate && checkOutDate && checkInDate <= today && checkOutDate >= today;
      let isFuture = checkInDate && checkInDate > today;
      const baseClass = "flex-shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 active:scale-95 whitespace-nowrap";
      if (isSelected) {
          if (isStayActive) return `${baseClass} border-emerald-500 text-emerald-700 bg-emerald-100 ring-2 ring-emerald-500/20`;
          if (isFuture) return `${baseClass} border-blue-500 text-blue-700 bg-blue-100 ring-2 ring-blue-500/20`;
          return `${baseClass} border-[#0052FF] text-[#0052FF] bg-blue-50`;
      } else {
          if (isStayActive) return `${baseClass} border-emerald-200 text-emerald-600 bg-emerald-50 hover:border-emerald-300`;
          if (isFuture) return `${baseClass} border-blue-200 text-blue-600 bg-blue-50 hover:border-blue-300`;
          return `${baseClass} border-slate-50 text-slate-400 bg-white hover:border-slate-200`;
      }
  };

  const exportGuestHistory = () => {
    const history = allAccessRecords
      .filter(a => a.propertyId === property.id)
      .sort((a, b) => new Date(b.checkIn || 0).getTime() - new Date(a.checkIn || 0).getTime());
    const headers = ['Nombre Huésped', 'Check-in', 'Check-out', 'Código Reserva', 'Código Puerta', 'Estado', 'Fecha Registro', 'Fecha Auditoría'];
    const csvRows = [headers.join(','), ...history.map(row => {
        const status = row.checkinStatus ? 'Check-in Realizado' : 'Pendiente';
        const issued = row.issuedAt || '-';
        const audited = row.registrationDate || 'Borrador';
        const safeName = `"${row.guestName || 'Sin Nombre'}"`;
        return [safeName, row.checkIn, row.checkOut, row.bookingCode, row.doorCode, status, issued, audited].join(',');
      })];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Reporte_${property.buildingName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: e.target.type === 'number' ? parseInt(value) || 0 : value }));
    if (['capacity', 'rooms', 'bathrooms'].includes(name)) setPropertyErrors([]);
  };

  const handleAccessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccessData(prev => ({ ...prev, [name]: value }));
    if (name === 'checkIn' || name === 'checkOut') setDateErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleOwnerAvatarUpload = (url: string) => { setOwnerAvatar(url); updateOwnerAvatarInStorage(url); };
  const handleOwnerAvatarDelete = () => { setOwnerAvatar(''); updateOwnerAvatarInStorage(''); };
  const updateOwnerAvatarInStorage = (url: string) => {
    const rawOwners = localStorage.getItem(STORAGE_KEYS.OWNERS);
    if (rawOwners) {
      const owners: Owner[] = JSON.parse(rawOwners);
      const updatedOwners = owners.map(o => o.id === property.ownerId ? { ...o, avatarUrl: url } : o);
      localStorage.setItem(STORAGE_KEYS.OWNERS, JSON.stringify(updatedOwners));
    }
  };
  const handleWelcomeImageUpload = (url: string) => setFormData(prev => ({ ...prev, welcomeImageUrl: url }));
  const handleWelcomeImageDelete = () => setFormData(prev => ({ ...prev, welcomeImageUrl: '' }));
  const handleStayImageUpload = (url: string) => setFormData(prev => ({ ...prev, stayImageUrl: url }));
  const handleStayImageDelete = () => setFormData(prev => ({ ...prev, stayImageUrl: '' }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPropErrors: string[] = [];
    if (!formData.capacity || formData.capacity.trim() === '' || formData.capacity === '0') newPropErrors.push(t.owner.errors.capacity);
    if (formData.rooms < 1) newPropErrors.push(t.owner.errors.rooms);
    if (formData.bathrooms < 1) newPropErrors.push(t.owner.errors.bathrooms);
    if (newPropErrors.length > 0) { setPropertyErrors(newPropErrors); setActiveTab('PROPIEDAD'); return; }

    setIsSaving(true);

    // --- GENERACIÓN DE RECOMENDACIONES IA ---
    // Solo regenerar si no hay o si cambió la ciudad/dirección significativamente
    let currentPropData = { ...formData };
    if (!currentPropData.aiRecommendations || currentPropData.city !== property.city || currentPropData.address !== property.address) {
       const aiRecs = await getNearbyPlaces(currentPropData.city, currentPropData.address);
       currentPropData.aiRecommendations = aiRecs;
    }

    let finalAccess = { ...accessData, propertyId: property.id };
    let isValid = true;
    if (activeTab === 'RESERVAS') {
        const errors: { checkIn?: string; checkOut?: string } = {};
        if (finalAccess.checkIn && finalAccess.checkOut) {
            const today = new Date(); today.setHours(0, 0, 0, 0); 
            const checkInDate = new Date(`${finalAccess.checkIn}T00:00:00`);
            const checkOutDate = new Date(`${finalAccess.checkOut}T00:00:00`);
            if (checkInDate < today) { errors.checkIn = t.owner.errors.datePast; isValid = false; }
            if (checkOutDate < checkInDate) { errors.checkOut = t.owner.errors.dateOrder; isValid = false; }
        }
        if (!isValid) { setDateErrors(errors); setIsSaving(false); return; } else { setDateErrors({}); }
        if (finalAccess.guestName?.trim() !== '' && finalAccess.checkIn?.trim() !== '' && !finalAccess.registrationDate) {
            finalAccess.registrationDate = new Date().toLocaleDateString();
        }
    }

    onSave(currentPropData, finalAccess);
    setFormData(currentPropData);
    setAccessData(finalAccess); 
    setAllAccessRecords(prev => {
        const exists = prev.some(a => a.id === finalAccess.id);
        if (exists) return prev.map(a => a.id === finalAccess.id ? finalAccess : a);
        return [...prev, finalAccess];
    });
    setIsSaving(false);
    setSaveSuccess(true);
    setIsBookingUnlocked(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    if (activeTab === 'PROPIEDAD') setActiveTab('MULTIMEDIA');
    else if (activeTab === 'MULTIMEDIA') setActiveTab('GUIAS');
    else if (activeTab === 'GUIAS') setActiveTab('RESERVAS');
    else onBack();
  };

  const navItem = (tab: Tab, label: string) => {
    const isDisabled = tab === 'RESERVAS' && !isBookingUnlocked;
    return (
      <button key={tab} type="button" disabled={isDisabled} onClick={() => !isDisabled && setActiveTab(tab)}
        className={`px-6 sm:px-10 py-4 sm:py-6 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] border-b-4 transition-all relative flex-shrink-0 ${
          activeTab === tab ? 'border-[#0052FF] text-[#0052FF] bg-blue-50/30' : 'border-transparent text-slate-300 hover:text-slate-500'
        } ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}>
        {label}
      </button>
    );
  };

  const inputClass = "w-full px-6 py-4 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-[#F8FAFC] text-[#212121] text-base placeholder-[#64748B] focus:bg-white focus:border-[#0052FF] focus:ring-4 focus:ring-[#0052FF]/10 outline-none transition-all duration-300 font-medium";
  const labelClass = "block text-[10px] font-black uppercase text-[#64748B] tracking-[0.15em] mb-2.5 ml-1";
  const errorClass = "text-rose-500 text-[10px] font-black uppercase tracking-wide mt-2 ml-1 animate-in fade-in slide-in-from-top-1";
  const isPlaceholder = accessData.guestName === 'Sin Nombre';

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4 sm:gap-0">
        <button onClick={onBack} className="group flex items-center space-x-2 text-[#64748B] hover:text-[#0052FF] transition-colors self-start">
          <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">{t.common.back}</span>
        </button>
        <div className="flex items-center space-x-4">
             <button onClick={onToggleLanguage} className="bg-white/50 backdrop-blur-sm border border-slate-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-[#0052FF] hover:bg-white transition-all shadow-sm">
                {language === 'es' ? 'EN' : 'ES'}
             </button>
        </div>
        <div className="flex items-center justify-end space-x-4 sm:space-x-6 w-full sm:w-auto">
          {saveSuccess && <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-right-2 hidden sm:block">{t.common.saved}</span>}
          <button onClick={handleSubmit} disabled={isSaving} className={`w-full sm:w-auto bg-[#0052FF] text-white px-8 sm:px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/10 transition-all ${isSaving ? 'opacity-40 cursor-wait' : 'hover:bg-blue-700 active:scale-95'}`}>
            {isSaving ? t.common.save : (activeTab === 'RESERVAS' ? t.common.finish : t.common.next)}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] sm:rounded-[3.5rem] shadow-2xl shadow-slate-100 border border-slate-50 overflow-hidden min-h-[500px]">
        <nav className="flex border-b border-slate-100 overflow-x-auto no-scrollbar">
          {navItem('PROPIEDAD', t.owner.tabs.config)}
          {navItem('MULTIMEDIA', t.owner.tabs.assets)}
          {navItem('GUIAS', t.owner.tabs.guides)}
          {navItem('RESERVAS', t.owner.tabs.checkins)}
        </nav>

        <form className="p-6 sm:p-12" onSubmit={handleSubmit}>
          {activeTab === 'PROPIEDAD' && (
            <div className="space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {propertyErrors.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                  {propertyErrors.map((err, i) => (
                    <p key={i} className="text-rose-600 text-[10px] font-black uppercase tracking-wide flex items-center">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-2"></span> {err}
                    </p>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="md:col-span-2">
                  <label className={labelClass}>{t.owner.form.buildingName}</label>
                  <input name="buildingName" value={formData.buildingName} onChange={handleChange} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{t.owner.form.address}</label>
                  <input name="address" value={formData.address} onChange={handleChange} className={inputClass} placeholder="Ej: Calle Mayor 123" />
                </div>
                <div><label className={labelClass}>{t.owner.form.hostName}</label><input name="hostName" value={formData.hostName} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}>{t.owner.form.city}</label><input name="city" value={formData.city} onChange={handleChange} className={inputClass} /></div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                  <div><label className={labelClass}>{t.owner.form.capacity}</label><input name="capacity" value={formData.capacity} onChange={handleChange} className={inputClass} /></div>
                  <div><label className={labelClass}>{t.owner.form.rooms}</label><input type="number" name="rooms" value={formData.rooms} onChange={handleChange} className={inputClass} /></div>
                  <div><label className={labelClass}>{t.owner.form.bathrooms}</label><input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleChange} className={inputClass} /></div>
                </div>
                <div className="md:col-span-2"><label className={labelClass}>{t.owner.form.wifiSSID}</label><input name="wifiSSID" value={formData.wifiSSID} onChange={handleChange} className={inputClass} /></div>
                <div className="md:col-span-2"><label className={labelClass}>{t.owner.form.wifiPass}</label><input name="wifiPass" value={formData.wifiPass} onChange={handleChange} className={inputClass + " font-mono"} /></div>
              </div>
            </div>
          )}

          {activeTab === 'MULTIMEDIA' && (
            <div className="space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 gap-8 sm:gap-12">
                <div className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">{t.owner.form.hostIdentity}</h3>
                  <ImageUploader label={t.owner.form.avatarLabel} currentUrl={ownerAvatar} contextName="avatar-uploader" isAvatar={true} onUploadSuccess={handleOwnerAvatarUpload} onDelete={handleOwnerAvatarDelete} />
                </div>
                <div className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">{t.owner.form.guestExp}</h3>
                  <div className="space-y-8 sm:space-y-10">
                    <ImageUploader label={t.owner.form.welcomeLabel} currentUrl={formData.welcomeImageUrl} contextName="welcome-uploader" onUploadSuccess={handleWelcomeImageUpload} onDelete={handleWelcomeImageDelete} />
                    <div className="w-full h-px bg-slate-200" />
                    <ImageUploader label={t.owner.form.dashboardLabel} currentUrl={formData.stayImageUrl} contextName="stay-uploader" onUploadSuccess={handleStayImageUpload} onDelete={handleStayImageDelete} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'GUIAS' && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div><label className={labelClass}>{t.owner.form.whatsapp}</label><input name="whatsappContact" value={formData.whatsappContact} onChange={handleChange} placeholder="+34..." className={inputClass} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div><label className={labelClass}>{t.owner.form.rules}</label><textarea name="rules" value={formData.rules} onChange={handleChange} rows={6} className={inputClass + " leading-relaxed"} /></div>
                <div><label className={labelClass}>{t.owner.form.checkout}</label><textarea name="checkoutInstructions" value={formData.checkoutInstructions} onChange={handleChange} rows={6} className={inputClass + " leading-relaxed"} /></div>
              </div>
              <div><label className={labelClass}>{t.owner.form.manual}</label><textarea name="guides" value={formData.guides} onChange={handleChange} rows={6} className={inputClass + " leading-relaxed"} /></div>
            </div>
          )}

          {/* PESTAÑA: RESERVAS */}
          {activeTab === 'RESERVAS' && (
            <div className="space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4 overflow-x-auto pb-4 no-scrollbar">
                  <button type="button" onClick={() => setAccessData({ id: `ac_${Date.now()}`, propertyId: property.id, guestName: '', checkIn: '', checkOut: '', bookingCode: '', doorCode: '', checkinStatus: false, issuedAt: null, registrationDate: null })} className="flex-shrink-0 px-6 py-3 bg-[#0052FF] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">{t.owner.form.newGuest}</button>
                  {activeGuests.map(g => (
                    <button key={g.id} type="button" onClick={() => setAccessData(g)} className={getGuestStatusStyle(g, accessData.id === g.id)}>{formatGuestLabel(g)}</button>
                  ))}
                </div>
                <button type="button" onClick={exportGuestHistory} className="self-start text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-dashed border-slate-300 rounded-lg px-4 py-2 hover:text-[#0052FF] transition-colors">{t.owner.form.downloadCsv}</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="md:col-span-2">
                  <label className={labelClass}>{t.owner.form.guestName}</label>
                  <input name="guestName" value={isPlaceholder ? '' : accessData.guestName} onChange={handleAccessChange} className={inputClass} />
                </div>

                {/* CAMPO: CHECK-IN CON ERROR */}
                <div>
                  <label className={labelClass}>{t.owner.form.checkIn}</label>
                  <input 
                    type="date" 
                    name="checkIn" 
                    value={isPlaceholder ? '' : accessData.checkIn} 
                    onChange={handleAccessChange} 
                    className={`${inputClass} ${dateErrors.checkIn ? 'border-rose-500 bg-rose-50/30' : ''}`} 
                  />
                  {dateErrors.checkIn && <p className={errorClass}>{dateErrors.checkIn}</p>}
                </div>

                {/* CAMPO: CHECK-OUT CON ERROR */}
                <div>
                  <label className={labelClass}>{t.owner.form.checkOut}</label>
                  <input 
                    type="date" 
                    name="checkOut" 
                    value={isPlaceholder ? '' : accessData.checkOut} 
                    onChange={handleAccessChange} 
                    className={`${inputClass} ${dateErrors.checkOut ? 'border-rose-500 bg-rose-50/30' : ''}`} 
                  />
                  {dateErrors.checkOut && <p className={errorClass}>{dateErrors.checkOut}</p>}
                </div>

                <div><label className={labelClass}>{t.owner.form.loginCode}</label><input name="bookingCode" value={isPlaceholder ? '' : accessData.bookingCode} onChange={handleAccessChange} className={inputClass + " uppercase"} /></div>
                <div><label className={labelClass}>{t.owner.form.doorCode}</label><input name="doorCode" value={isPlaceholder ? '' : accessData.doorCode} onChange={handleAccessChange} className={inputClass} /></div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.owner.form.regStatus}</p><p className="text-xs font-bold text-slate-700">{accessData.checkinStatus ? `${t.owner.form.statusChecked} ${accessData.issuedAt}` : t.owner.form.statusPending}</p></div>
                <div className="text-left sm:text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.owner.form.regDate}</p><p className="text-xs font-bold text-[#0052FF]">{accessData.registrationDate || t.owner.form.statusDraft}</p></div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default PropertyForm;
