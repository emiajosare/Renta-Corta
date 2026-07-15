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
  is_founder?: boolean;
}

// Fila cruda de la tabla `owners` en Supabase (snake_case)
export interface OwnerRow {
  id: string;
  name: string;
  email?: string;
  master_pin?: string;
  token: string;
  is_first_login: boolean;
  role?: 'owner' | 'superadmin';
  avatar_url?: string;
  is_founder?: boolean;
  subscription_status?: string;
}

export interface NearbyPlace {
  name: string;
  type: string;
  rating: number;
  description: string;
  distance: string;
}

// Datos capturados en el formulario rápido de HostDashboard antes de crear la propiedad
export interface NewPropertyInitialData {
  propName?: string;
  city?: string;
  address?: string;
  bgImage?: string;
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
  aiRecommendations?: Record<string, NearbyPlace[]>;
  nearbyPlaces?: Record<string, NearbyPlace[]>;
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
  LANDING_PAGE: 'LANDING_PAGE',       // 🟢 NUEVO
  HOST_ONBOARDING: 'HOST_ONBOARDING', // 🟢 NUEVO
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