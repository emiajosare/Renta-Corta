
import React, { useState, useEffect } from 'react';
import type { PropertySettings, AccessControl, Owner, Language } from '../types';
import { STORAGE_KEYS } from '../constants';
import { translations } from '../translations';

interface GuestDashboardProps {
  property: PropertySettings;
  access: AccessControl;
  onCheckIn: (accessId: string) => void;
  onLogout: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

type GuestTab = 'RESUMEN' | 'MANUAL' | 'EXPLORA' | 'CHECK-OUT';

const GuestDashboard: React.FC<GuestDashboardProps> = ({ property, access, onCheckIn, onLogout, language, onToggleLanguage }) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<GuestTab>('RESUMEN');
  const [showDoorModal, setShowDoorModal] = useState(false);
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [hostAvatar, setHostAvatar] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  

  const handleScroll = () => {
    if (scrollRef.current) {
      setShowLeftArrow(scrollRef.current.scrollLeft > 10);
    }
  };

  // --- PERSISTENT TIMER LOGIC (RESTAURADA Y ACTIVADA) ---
const TIMER_DURATION_SEC = 1800; // 30 minutos

const calculateTimeLeft = () => {
  // 1. Verificamos que haya hecho check-in y que tengamos la marca de tiempo
  // Usamos Number(access.issuedAt) porque lo enviamos como string desde App.tsx
  if (!access.checkinStatus || !access.issuedAt) return TIMER_DURATION_SEC;
  
  const startTime = isNaN(Number(access.issuedAt)) 
    ? new Date(access.issuedAt).getTime() // Si es ISO, lo convertimos
    : Number(access.issuedAt);            // Si ya es número, lo usamos
    
  if (isNaN(startTime)) return TIMER_DURATION_SEC;
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - startTime) / 1000);
  const remaining = TIMER_DURATION_SEC - elapsedSeconds;
  
  return Math.max(0, remaining);
};

const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
const [timerExpired, setTimerExpired] = useState(timeLeft <= 0);

// --- EL MOTOR (HEARTBEAT): Esto hace que el diseño se mueva ---
useEffect(() => {
  if (!access.checkinStatus || timeLeft <= 0) return;

  const interval = setInterval(() => {
    const newTime = calculateTimeLeft();
    setTimeLeft(newTime);
    if (newTime <= 0) {
      setTimerExpired(true);
      clearInterval(interval);
    }
  }, 1000); // Se ejecuta cada segundo

  return () => clearInterval(interval);
}, [access.checkinStatus, access.issuedAt]);

const displayDoorCode = timerExpired ? '****' : access.doorCode;

  // Iconos inteligentes para categorías
  const categoryIcons: Record<string, string> = {
    'Restaurantes': '🍴', 'Comida': '🍴', 'Gastronomía': '🍴',
    'Parques': '🌳', 'Naturaleza': '🌳', 'Playas': '🏖️', 'Mar': '🏖️',
    'Museos': '🏛️', 'Cultura': '🏛️', 'Centros Comerciales': '🛍️', 'Compras': '🛍️',
    'Farmacias': '💊', 'Supermercados': '🛒', 'Default': '📍'
  };

  useEffect(() => {
    let interval: number;
    if (access.checkinStatus && !timerExpired) {
      interval = window.setInterval(() => {
        const currentRemaining = calculateTimeLeft();
        setTimeLeft(currentRemaining);
        if (currentRemaining <= 0) { setTimerExpired(true); clearInterval(interval); }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [access.checkinStatus, access.checkInTimestamp, timerExpired]);

  useEffect(() => {
    const rawOwners = localStorage.getItem(STORAGE_KEYS.OWNERS);
    if (rawOwners) {
      const owners: Owner[] = JSON.parse(rawOwners);
      const owner = owners.find(o => o.id === property.ownerId);
      if (owner?.avatarUrl) setHostAvatar(owner.avatarUrl);
    }
  }, [property.ownerId]);

  // Sincronización robusta de categorías
  useEffect(() => {
    if (property.aiRecommendations) {
      const categories = Object.keys(property.aiRecommendations);
      if (categories.length > 0 && (!activeCategory || !categories.includes(activeCategory))) {
        setActiveCategory(categories[0]);
      }
    }
  }, [property.aiRecommendations, activeCategory]);

  const formatTime = (seconds: number) => {
    const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
    const ss = (seconds % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleConfirmCheckin = () => { onCheckIn(access.id); setShowDoorModal(true); };
  const handleNavClick = (id: string) => {
    if (id === 'WIFI') setShowWifiModal(true);
    else setActiveTab(id as GuestTab);
  };

  const handleCopy = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const parseList = (text: string) => text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const whatsappUrl = `https://wa.me/${property.whatsappContact.replace(/\D/g, '')}`;

  const getFlexibleFontSize = (text: string) => {
    const length = text ? text.length : 0;
    if (length <= 4) return 'text-[clamp(4rem,10vw,6rem)]';
    if (length <= 6) return 'text-[clamp(3rem,8vw,4.5rem)]';
    if (length <= 8) return 'text-[clamp(2rem,6vw,3.5rem)]';
    return 'text-[clamp(1.5rem,4vw,2.5rem)]';
  };

  const getDockLabel = (id: string) => {
      if (id === 'RESUMEN') return t.guest.tabs.home;
      if (id === 'MANUAL') return t.guest.tabs.manual;
      if (id === 'EXPLORA') return t.guest.tabs.explore;
      if (id === 'WIFI') return t.guest.tabs.wifi;
      if (id === 'CHECK-OUT') return t.guest.tabs.checkout;
      return id;
  };

  const DarkSection = ({ title, subtitle, items, icon }: { title: string, subtitle: string, items: string[], icon: React.ReactNode }) => (
    <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">{icon}</div>
                <div><h3 className="text-2xl font-black tracking-tight mb-1">{title}</h3><p className="text-white/60 text-xs font-bold uppercase tracking-widest">{subtitle}</p></div>
            </div>
            <div className="space-y-3">
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-start p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                         <span className="mr-4 mt-1 text-white/40"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></span>
                         <p className="text-sm font-medium text-slate-200 leading-relaxed">{item}</p>
                    </div>
                ))}
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 text-center"><p className="text-[9px] font-black tracking-[0.2em] text-white/30">@erasoDigital</p></div>
        </div>
    </div>
  );

  const scrollCategories = (direction: 'left' | 'right') => {
  if (scrollRef.current) {
    const scrollAmount = 200;
    scrollRef.current.scrollBy({ 
      left: direction === 'right' ? scrollAmount : -scrollAmount, 
      behavior: 'smooth' 
    });
  }
};

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans overflow-x-hidden selection:bg-[#0052FF] selection:text-white">
      <header className="px-6 pt-8 pb-4 flex justify-between items-end animate-in fade-in slide-in-from-top-4 duration-700">
          <div><p className="text-[#0052FF] text-[10px] font-black tracking-[0.3em] mb-1">@erasoDigital</p><h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter truncate max-w-[200px] sm:max-w-md">{t.guest.hello}, {access.guestName}</h1></div>
          <button onClick={onLogout} className="bg-white text-slate-900 px-5 py-2.5 rounded-full border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors active:scale-95">{t.common.logout}</button>
      </header>

      {/* HERO SECTION - REUTILIZADO */}
      <div className="relative mx-4 h-[45vh] min-h-[400px] rounded-[2.5rem] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] z-10 bg-slate-900 group transform transition-all duration-500">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[3s] ease-in-out scale-105 group-hover:scale-110" 
          style={{ backgroundImage: `url(${property.stayImageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'})` }}
        ></div>
  
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80"></div>

        {/* Header Info: Name, Address & Language */}
        <div className="absolute top-0 inset-x-0 p-6 sm:p-8 pt-8 flex justify-between items-start animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="text-white">
            <h2 className="text-2xl sm:text-3xl font-black leading-none mb-2 tracking-tight drop-shadow-lg max-w-[70%]">
              {property.buildingName}
            </h2>
            <p className="text-white/80 text-xs sm:text-sm font-medium mb-4 drop-shadow-md flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
           {property.address}
          </p>

          {/* NUEVOS BADGES CON ICONOS */}
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] font-bold tracking-wider text-white">
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {property.capacity}
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {property.rooms}
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {property.bathrooms}
            </span>
          </div>
        </div>

        <button 
          onClick={onToggleLanguage} 
          className="bg-white/20 backdrop-blur-xl border border-white/30 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/30 transition-all shadow-lg active:scale-95"
        >
          {language === 'es' ? 'EN' : 'ES'}
        </button>
      </div>

      {/* Dock Inferior */}
      <div className="absolute bottom-6 inset-x-0 flex justify-center z-30 pointer-events-none">
        <div className="flex gap-2 sm:gap-4 px-4 py-3 bg-black/30 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl pointer-events-auto overflow-x-auto no-scrollbar max-w-[95%]">
          {[
            { id: 'RESUMEN', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/> },
            { id: 'MANUAL', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
            { id: 'EXPLORA', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /> },
            { id: 'WIFI', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /> },
            { id: 'CHECK-OUT', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /> }
          ].map((item) => (
            <div key={item.id} className="flex flex-col items-center">
              <button 
                onClick={() => handleNavClick(item.id)} 
                disabled={!access.checkinStatus && item.id !== 'RESUMEN'}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                  activeTab === item.id && (item.id as string) !== 'WIFI' ? 'bg-white text-[#0052FF] shadow-lg scale-110' : 'text-white/80 hover:text-white'
                } ${(!access.checkinStatus && item.id !== 'RESUMEN') ? 'opacity-20 cursor-not-allowed' : 'opacity-100'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{item.icon}</svg>
              </button>
              <span className={`text-[8px] font-black uppercase tracking-wider mt-1 transition-all duration-300 ${activeTab === item.id && (item.id as string) !== 'WIFI' ? 'text-white' : 'text-white/60 hidden sm:block'}`}>
                {getDockLabel(item.id)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>

      <main className="max-w-3xl mx-auto px-6 pt-8 pb-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* PESTAÑA: RESUMEN */}
        {activeTab === 'RESUMEN' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-slate-400 uppercase tracking-widest text-center">{t.guest.welcomeDynamic.replace('{building}', property.buildingName)}</h2>
            {!access.checkinStatus ? (
               <button onClick={handleConfirmCheckin} className="w-full bg-[#0052FF] text-white py-12 rounded-[2.5rem] font-black text-2xl shadow-2xl transition-transform active:scale-[0.98] border border-blue-400/20">
                 <span>{t.guest.checkInBtn}</span><span className="text-xs font-bold block opacity-90 uppercase tracking-widest mt-2">{t.guest.unlockText}</span>
               </button>
            ) : (
              <div className="grid gap-6">
                 <button onClick={() => setShowDoorModal(true)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group transition-all">
                    <div className="text-left"><span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.guest.accessCard}</span><span className="text-2xl font-black text-[#212121] tracking-tight group-hover:text-[#0052FF] transition-colors">{t.guest.viewKey}</span></div>
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-[#0052FF] group-hover:text-white transition-all"><svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></div>
                 </button>
                 <a href={whatsappUrl} target="_blank" className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex items-center space-x-5 transition-all group">
                    <div className="w-14 h-14 bg-[#25D366] text-white rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.63.078-1.554-.277-.384-.148-.823-.33-1.341-.561-2.204-.981-3.64-3.21-3.75-3.354-.11-.144-.894-1.192-.894-2.274 0-1.082.567-1.613.77-1.83.203-.217.443-.271.591-.271.148 0 .296.002.423.007.132.006.31-.024.485.405.176.43.606 1.48.659 1.591.053.111.089.24.015.39-.074.15-.11.243-.218.372-.11.129-.23.287-.329.385-.11.109-.226.228-.098.448.128.22.568.937 1.22 1.519.84.75 1.55.982 1.77 1.092.22.11.351.092.482-.058.13-.15.559-.65.707-.872.148-.222.296-.187.5-.112.204.075 1.293.61 1.514.72.221.112.37.166.425.259.056.093.056.54-.088.945z"/>
                      </svg>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-lg font-black text-[#212121] tracking-tight truncate">{t.guest.support}</h4>
                      <p className="text-[#25D366] text-xs font-black uppercase tracking-widest mt-0.5">{t.guest.contactHost}</p>
                    </div>
                  </a>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: MANUAL */}
        {activeTab === 'MANUAL' && (
           <div className="space-y-6">
              <DarkSection title={t.guest.headers.manual} subtitle={t.guest.headers.manualSub} items={parseList(property.guides)} icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} />
              <DarkSection title={t.guest.headers.rules} subtitle={t.guest.headers.rulesSub} items={parseList(property.rules)} icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
           </div>
        )}

        {/* PESTAÑA: EXPLORA (Guía de IA) */}
        {activeTab === 'EXPLORA' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="px-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.guest.nearby}</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{t.guest.aiRecs}</p>
            </div>

            {/* CATEGORY SELECTOR - CONEXIÓN COMPLETA */}
            {property.aiRecommendations && Object.keys(property.aiRecommendations).length > 0 ? (
              <>
                <style>{`
                  .no-scrollbar::-webkit-scrollbar { display: none; }
                  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>

                <div className="relative mb-6 group"> 
                  
                  {/* FLECHA IZQUIERDA: Aquí usamos "showLeftArrow" */}
                  {showLeftArrow && (
                    <div className="absolute left-[-2px] top-0 bottom-2 w-20 bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent flex items-center justify-start z-20 pointer-events-none animate-in fade-in duration-300">
                        <button 
                          onClick={() => scrollCategories('left')}
                          className="w-8 h-8 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center ml-1 pointer-events-auto active:scale-90 transition-transform"
                        >
                          <svg className="w-4 h-4 text-[#0052FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                    </div>
                  )}

                  {/* CONTENEDOR: Aquí usamos "scrollRef" y "handleScroll" */}
                  <div 
                    ref={scrollRef}
                    onScroll={handleScroll} // <--- Esta es la conexión que falta
                    className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth relative z-10"
                  >
                    {Object.keys(property.aiRecommendations).map(cat => (
                      <button 
                        key={cat} 
                        id={`cat-${cat}`}
                        onClick={() => {
                          setActiveCategory(cat);
                          document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                        className={`flex-shrink-0 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                          activeCategory === cat 
                              ? 'bg-[#111111] text-white border-black shadow-xl scale-105' 
                              : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <span className="mr-2">{categoryIcons[cat] || categoryIcons.Default}</span>
                        {cat}
                      </button>
                    ))}
                  </div>
                  
                  {/* FLECHA DERECHA */}
                  <div className="absolute right-[-2px] top-0 bottom-2 w-20 bg-gradient-to-l from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent flex items-center justify-end z-20 pointer-events-none">
                      <button 
                        onClick={() => scrollCategories('right')}
                        className="w-8 h-8 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center mr-1 pointer-events-auto active:scale-90 transition-transform"
                      >
                        <svg className="w-4 h-4 text-[#0052FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                  </div>
                </div>

                {/* GRID DE RECOMENDACIONES (Sin cambios) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                  {(property.aiRecommendations?.[activeCategory] || []).map((place, i) => (
                    <a 
                      key={i} 
                      href={`https://www.google.com/search?q=${encodeURIComponent(place.name + " " + property.city)}`} 
                      target="_blank"
                      className="group relative bg-[#111111] p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between hover:border-white/20 hover:-translate-y-1 transition-all duration-500 overflow-hidden shadow-2xl"
                    >
                      {/* Efecto de brillo ambiental al pasar el dedo/mouse */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#0052FF]/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                          <span className="bg-white/5 backdrop-blur-md border border-white/10 text-white/70 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
                            {place.type}
                          </span>
                          <div className="flex items-center text-amber-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                            <span className="text-[10px] font-black mr-1">{place.rating}</span>
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                        </div>
                        
                        <h4 className="font-black text-white text-2xl leading-tight mb-3 tracking-tight group-hover:text-[#0052FF] transition-colors duration-300">
                          {place.name}
                        </h4>
                        
                        <p className="text-white/40 text-sm font-medium leading-relaxed mb-8 line-clamp-3">
                          {place.description}
                        </p>
                      </div>

                      <div className="relative z-10 pt-6 border-t border-white/5 text-white/30 text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-between group-hover:text-white transition-colors">
                        <span>{t.guest.viewMap}</span>
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            ) : (
              /* Tu estado de carga de lujo */
              <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-100 border-dashed animate-pulse">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">✨</span>
                </div>
                <h4 className="text-xl font-black text-slate-800 mb-2">Personalizando tu guía...</h4>
                <p className="text-slate-400 text-xs font-medium max-w-[200px] mx-auto">Nuestro conserje digital está seleccionando los mejores lugares en {property.city}.</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'CHECK-OUT' && (
            <DarkSection title={t.guest.headers.checkout} subtitle={t.guest.headers.checkoutSub} items={parseList(property.checkoutInstructions)} icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>} />
        )}

        <div className="py-12 flex flex-col items-center opacity-60">
           <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-200 mb-3">{hostAvatar ? <img src={hostAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-300"></div>}</div>
           <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.guest.hostTitle} {property.hostName}</p>
        </div>
      </main>

      {/* MODALS REUTILIZADOS */}
      {showDoorModal && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/80 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="bg-white w-full sm:max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 pb-12 text-center shadow-2xl relative animate-in slide-in-from-bottom-20 duration-500">
             <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
             <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8">{t.guest.modals.doorTitle}</h3>
             <div className="bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] py-12 mb-8 relative overflow-hidden group">
                 <span className={`${getFlexibleFontSize(displayDoorCode)} font-black text-[#212121] tracking-tighter leading-none block break-all`}>{displayDoorCode}</span>
             </div>
             <div className="flex flex-col items-center space-y-2 mb-8"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.guest.modals.availableFor}</p><p className="text-3xl font-mono font-black text-[#0052FF] tracking-tight">{formatTime(timeLeft)}</p></div>
             <button onClick={() => setShowDoorModal(false)} className="w-full bg-[#212121] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs">{t.guest.hideKey}</button>
          </div>
        </div>
      )}

      {showWifiModal && (
         <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full sm:max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 pb-12 shadow-2xl relative border border-white/10">
               <button onClick={() => setShowWifiModal(false)} className="absolute top-8 right-8 text-white/50 hover:text-white z-20"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
               <div className="relative z-10">
                   <div className="w-20 h-20 bg-white/5 text-[#0052FF] rounded-[2rem] flex items-center justify-center mb-8 border border-white/5"><svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg></div>
                   <h3 className="text-3xl font-black text-white tracking-tight mb-2">{t.guest.modals.wifiTitle}</h3>
                   <div className="flex justify-center mb-10"><div className="p-4 bg-white rounded-3xl"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=WIFI:S:${property.wifiSSID};T:WPA;P:${property.wifiPass};;`} className="w-40 h-40 mix-blend-multiply" /></div></div>
                   <div className="space-y-4">
                      <div className="bg-white/5 p-5 rounded-3xl border border-white/5 flex justify-between items-center gap-4">
                         <div className="min-w-0"><p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">{t.guest.modals.network}</p><p className={`${getFlexibleFontSize(property.wifiSSID)} font-black text-white truncate leading-none`}>{property.wifiSSID}</p></div>
                         <button onClick={() => handleCopy(property.wifiSSID, 'ssid')} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/70">{copiedField === 'ssid' ? '✓' : '❐'}</button>
                      </div>
                      <div className="bg-[#0052FF] p-5 rounded-3xl flex justify-between items-center gap-4">
                         <div className="relative z-10 min-w-0"><p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">{t.guest.modals.password}</p><p className={`${getFlexibleFontSize(property.wifiPass)} font-black text-white font-mono leading-none truncate`}>{property.wifiPass}</p></div>
                         <button onClick={() => handleCopy(property.wifiPass, 'pass')} className="w-12 h-12 bg-black/20 rounded-2xl flex items-center justify-center text-white/90">{copiedField === 'pass' ? '✓' : '❐'}</button>
                      </div>
                   </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default GuestDashboard;