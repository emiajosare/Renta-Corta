import { supabase } from '../lib/supabaseClient';

export const getNearbyPlaces = async (city: string, address: string) => {
  try {
    console.log("🛡️ Solicitando guía de lujo a través de HostFlow Secure...");

    // Llamamos a tu nueva Edge Function
    const { data, error } = await supabase.functions.invoke('get-recommendations', {
      body: { city, address }
    });

    if (error) throw error;

    // Extraemos el texto de la respuesta de Gemini que viene de la función
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.warn("⚠️ La IA no devolvió texto válido.");
      return getDefaultCategories();
    }

    console.log("✅ Guía de lujo recibida desde el servidor.");
    return parseResponse(text);

  } catch (error: any) {
    console.error("⚠️ Error en el motor seguro de HostFlow:", error.message);
    return getDefaultCategories();
  }
};

// Función para procesar el formato: Categoría || Nombre || Dirección || Rating || Descripción
function parseResponse(text: string) {
  const cleanText = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').replace(/\*/g, '').trim();
  const lines = cleanText.split('\n').filter(l => l.includes('||'));
  
  const categorized: any = { 
    "Restaurantes": [], "Farmacias": [], "Compras": [], "Cultura": [], "Naturaleza": [] 
  };

  lines.forEach(line => {
    const parts = line.split('||').map(s => s.trim());
    if (parts.length >= 4) {
      const [cat, name, addr, rate, desc] = parts;
      const key = Object.keys(categorized).find(k => k.toLowerCase() === cat.toLowerCase());
      if (key) {
        categorized[key].push({
          name,
          type: key,
          rating: parseFloat(rate) || 4.5,
          description: desc || addr,
          distance: "Cerca de ti"
        });
      }
    }
  });
  return categorized;
}

function getDefaultCategories() {
  return { "Restaurantes": [], "Farmacias": [], "Compras": [], "Cultura": [], "Naturaleza": [] };
}