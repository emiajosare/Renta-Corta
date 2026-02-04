
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Configuración de la API Key (Usando el estándar de Vite)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export const getNearbyPlaces = async (city: string, propertyAddress: string) => {
  // 2. Inicializamos el modelo con la herramienta de Google Search activa
  // Nota: He mantenido tu modelo 'gemini-2.0-flash' (o el que prefieras usar)
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash", // Ajustado a la versión estable de 2026 con Grounding
    tools: [{ googleSearch: {} }] as any, 
  });

  const prompt = `Search for the top 12 real and popular places in ${city} near ${propertyAddress}. 
      Include restaurants, pharmacies, supermarkets, parks, and cafes.
      Format the output as a JSON object where keys are categories: 'Restaurantes', 'Cafés', 'Farmacias', 'Supermercados', 'Parques'.
      Each category should be an array of objects with:
      - name: Full name
      - description: One short, elegant sentence in Spanish
      - rating: Numerical rating
      - formattedAddress: Short address
      - type: Specific type`;

  try {
    // 3. Generación de contenido con Grounding (Búsqueda real)
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text() || "{}";

    // 4. Limpieza de formato Markdown JSON
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let recommendations = {};
    try {
        recommendations = JSON.parse(text);
    } catch (e) {
        console.warn("Could not parse recommendations JSON:", e);
        // Si falla el parseo, intentamos extraer el JSON con un regex
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) recommendations = JSON.parse(jsonMatch[0]);
    }

    return recommendations;
  } catch (error) {
    console.error("Error fetching places with Gemini Search:", error);
    return {};
  }
};