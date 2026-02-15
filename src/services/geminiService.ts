import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Objeto de respaldo garantizado
const DEFAULT_FALLBACK = {
  "Restaurantes": [{ name: "Lugar Recomendado", type: "Gastronomía", rating: 5, description: "Cerca de la propiedad.", distance: "Local" }],
  "Farmacias": [{ name: "Farmacia Local", type: "Salud", rating: 5, description: "Servicio cercano.", distance: "Local" }],
  "Compras": [], "Cultura": [], "Naturaleza": []
};

export const getNearbyPlaces = async (city: string, address: string) => {
  try {
    const prompt = `Actúa como guía experto. Para la ubicación "${address}, ${city}", busca lugares REALES (radio 10km).
    Genera exactamente 5 lugares para cada una de estas categorías: Restaurantes, Farmacias, Compras, Cultura, Naturaleza.

    FORMATO DE RESPUESTA (Responde SOLO esto, sin texto extra, sin asteriscos):
    Restaurantes || Nombre || Dirección || 4.5 || Descripción breve
    Farmacias || Nombre || Dirección || 4.0 || Descripción breve
    ... (continúa con todas las categorías)`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: prompt,
      config: { tools: [{ googleMaps: {} } as any] },
    });

    const text = response.text || "";
    // Limpiamos asteriscos y símbolos que Gemini a veces añade por error
    const cleanText = text.replace(/\*/g, ''); 
    const lines = cleanText.split('\n').filter(l => l.includes('||'));

    const categorized: any = { 
      "Restaurantes": [], "Farmacias": [], "Compras": [], "Cultura": [], "Naturaleza": [] 
    };

    lines.forEach(line => {
      const parts = line.split('||').map(s => s.trim());
      if (parts.length >= 4) {
        const [cat, name, addr, rate, desc] = parts;
        // Normalizamos la categoría (primera letra mayúscula)
        const key = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
        
        if (categorized[key]) {
          categorized[key].push({
            name: name || "Lugar Recomendado",
            type: cat,
            rating: parseFloat(rate) || 4.5,
            description: desc || addr || "Ubicado cerca de la propiedad.",
            distance: "Cerca de ti"
          });
        }
      }
    });

    // Verificamos si logramos llenar al menos una categoría
    const hasData = Object.values(categorized).some((arr: any) => arr.length > 0);
    return hasData ? categorized : DEFAULT_FALLBACK;

  } catch (error) {
    console.error("⚠️ Error en Gemini:", error);
    return DEFAULT_FALLBACK;
  }
};