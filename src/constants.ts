
import type { AccessControl, PropertySettings, Owner } from './types';

export const STORAGE_KEYS = {
  OWNERS: 'ss_owners',
  PROPERTIES: 'ss_properties',
  ACCESS_CONTROL: 'ss_access_control'
};

// --- UUIDs GENERADOS PARA DESARROLLO ---
const OWNER_UUID = '56836cfb-9adf-4b22-8dd9-902a7116d0d2';
const PROPERTY_UUID = 'f4df9ab1-ca1f-4257-a9f1-7a1c5735c3bf';
const ACCESS_UUID = '91e98ce4-d36c-4240-bcd8-0a4bb501002f';

export const MOCK_OWNERS: Owner[] = [
  { 
    id: OWNER_UUID, 
    name: 'Admin Principal', 
    token: 'ADMIN2024', 
    tokenPersonalized: false,
    avatarUrl: 'https://i.postimg.cc/nrfLXyq3/David.png',
    
    // 🟢 AÑADIMOS ESTO PARA ELIMINAR EL ERROR ROJO:
    email: 'admin@ejemplo.com', 
    master_pin: 'ADMIN2024', // Lo dejamos igual al token para que no te bloquee
    is_first_login: true     // 🚩 IMPORTANTE: Ponlo en TRUE para probar el flujo de seguridad
  }
];

export const MOCK_PROPERTIES: PropertySettings[] = [
  {
    id: PROPERTY_UUID,
    ownerId: OWNER_UUID, // Vinculado al OWNER_UUID
    buildingName: 'Escribe el nombre de tu Propiedad',
    hostName: 'Nombre del Anfritrion',
    city: 'Ciudad del Lugar',
    address: 'Direccion del Lugar',
    capacity: 'Maxima capacidad del lugar',
    rooms: 2,
    bathrooms: 1,
    wifiSSID: 'El Nombre de tu WIFI',
    wifiPass: 'Password del WIFI',
    rules: '🚭 No Fumar en el inmueble\n🐾 No se admiten mascotas\n🤫 Respetar horas de silencio\n🎉 Prohibidas las fiestas',
    guides: 'TV: Control remoto negro en la mesa.\nAire: Configurar a 22 grados.\nLavadora: Detergente en el cajón superior.',
    checkoutInstructions: '🔑 Dejar llaves en la mesa\n🗑️ Tirar la basura\n💡 Apagar luces\n🪟 Cerrar ventanas',
    whatsappContact: '+34600000000',
    welcomeImageUrl: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1600&q=80',
    stayImageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'
  }
];

const today = new Date();
const checkInDate = today.toISOString().split('T')[0];
const checkOutDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export const MOCK_ACCESS: AccessControl[] = [
  {
    id: ACCESS_UUID,
    propertyId: PROPERTY_UUID, // Vinculado al PROPERTY_UUID
    guestName: 'Sin Nombre',
    checkIn: checkInDate,
    checkOut: checkOutDate,
    bookingCode: 'GUEST777',
    doorCode: '4829',
    checkinStatus: false,
    issuedAt: null
  }
];