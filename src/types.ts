
// 1. Corregido el export y mantenemos todos los tipos
export type Language = 'es' | 'en';
export type ImageSize = '1K' | '2K' | '4K';

export interface Owner {
  id: string;
  name: string;
  token: string;
  tokenPersonalized: boolean;
  avatarUrl?: string; // Mantenido: perfil
}

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
  checkoutInstructions: string; // Mantenido: dinámico
  whatsappContact: string;
  welcomeImageUrl?: string; // Mantenido: fondo login
  stayImageUrl?: string;    // Mantenido: imagen principal
  aiRecommendations?: Record<string, any[]>; // Mantenido: CACHÉ DE IA
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
  checkInTimestamp?: number; // Mantenido: PERSISTENCIA TEMPORIZADOR
  registrationDate?: string | null; // Mantenido: AUDITORÍA INMUTABLE
}

// Mantenemos la estructura de AppView que funciona con Vite
export const AppView = {
  LOGIN_CHOICE: 'LOGIN_CHOICE',
  OWNER_LOGIN: 'OWNER_LOGIN',
  PROPERTY_LIST: 'PROPERTY_LIST',
  PROPERTY_DETAIL: 'PROPERTY_DETAIL',
  GUEST_LOGIN: 'GUEST_LOGIN',
  GUEST_DASHBOARD: 'GUEST_DASHBOARD',
  INITIAL_SECURITY: 'INITIAL_SECURITY'
} as const;

export type AppView = typeof AppView[keyof typeof AppView];
// Añade 'WIFI' a la unión de tipos para que sea una opción legal
export type GuestTab = 'RESUMEN' | 'GUIA' | 'REGLAS' | 'CHECKOUT' | 'WIFI' | 'MAPS';