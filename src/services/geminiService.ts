import { supabase } from '../lib/supabaseClient';

export const getNearbyPlaces = async (city: string, address: string) => {
  try {
    // 1. Llamada limpia (la llave está oculta en el servidor de Supabase)
    const { data, error } = await supabase.functions.invoke('get-recommendations', {
      body: { city, address }
    });

    if (error) throw new Error("Error en el servidor de recomendaciones");

    // 2. Si recibimos un error de Google dentro del objeto data, no lo imprimas todo
    if (data.error) {
      console.error("❌ Error de Google detectado. Revisa la cuota en el panel de control.");
      return getDefaultCategories();
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? parseResponse(text) : getDefaultCategories();

  } catch (error: any) {
    console.error("⚠️ Error silencioso en el motor de HostFlow");
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