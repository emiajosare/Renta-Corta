import { createClient } from '@supabase/supabase-js';

// Estas llaves se leen de tu archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("URL de Supabase:", import.meta.env.VITE_SUPABASE_URL);
console.log("¿Hay llave Anon?:", !!import.meta.env.VITE_SUPABASE_ANON_KEY);

console.log("Inicio de la llave:", import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 5));