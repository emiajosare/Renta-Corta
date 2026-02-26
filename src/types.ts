// 1. Corregido el export y mantenemos todos los tipos
export type Language = 'es' | 'en';
export type ImageSize = '1K' | '2K' | '4K';

export interface Owner {
  id: string;
  name: string;
  token: string;
  tokenPersonalized: boolean;
  avatarUrl?: string; // Mantenido: perfil
  // Campos sincronizados con Supabase
  email: string;             
  master_pin: string;        
  is_first_login: boolean;
  role: 'owner' | 'superadmin';
}

// ✅ CORREGIDO: Interfaz unificada (era duplicada, causaba error de compilación)
export interface PropertySettings {
  id: string;
  ownerId: string;
  buildingName: string;
  hostName: string;
  city: string;
  address: string;
  capacity: string;
  rooms: number;
  bathrooms: number;
  wifiSSID: string;
  wifiPass: string;
  rules: string;
  guides: string;
  checkoutInstructions: string;
  whatsappContact: string;
  welcomeImageUrl?: string;
  stayImageUrl?: string;
  aiRecommendations?: Record<string, any[]>;
  location_lat?: number;  // ✅ Fusionado aquí (antes estaba en interfaz duplicada)
  location_lng?: number;  // ✅ Fusionado aquí (antes estaba en interfaz duplicada)
}

export interface AccessControl {
  id: string;
  propertyId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  bookingCode: string;
  doorCode: string;
  checkinStatus: boolean;
  issuedAt: string | null;
  checkInTimestamp?: number;
  registrationDate?: string | null;
  doorCodeDuration?: number; // Duración en días (si es null/undefined usa 30 min por defecto)
}

// AppView - fuente única de verdad (el archivo AppView.ts separado ya no es necesario)
export const AppView = {
  LOGIN_CHOICE: 'LOGIN_CHOICE',
  OWNER_LOGIN: 'OWNER_LOGIN',
  PROPERTY_LIST: 'PROPERTY_LIST',
  PROPERTY_DETAIL: 'PROPERTY_DETAIL',
  OWNER_DASHBOARD: 'OWNER_DASHBOARD',
  GUEST_LOGIN: 'GUEST_LOGIN',
  GUEST_DASHBOARD: 'GUEST_DASHBOARD',
  SUPER_ADMIN_PANEL: 'SUPER_ADMIN_PANEL',
  INITIAL_SECURITY: 'INITIAL_SECURITY'
} as const;

export type AppView = typeof AppView[keyof typeof AppView];

export type GuestTab = 'RESUMEN' | 'GUIA' | 'REGLAS' | 'CHECKOUT' | 'WIFI' | 'MAPS';