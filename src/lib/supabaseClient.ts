import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ✅ CORREGIDO: Los console.log anteriores exponían las claves en producción.
// Solo mostramos info de conexión en modo desarrollo.
if (import.meta.env.DEV) {
  console.log("🔌 Supabase conectado:", supabaseUrl);
}
