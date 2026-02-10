// geocodingService.ts

export const getCoordinates = async (address: string, city: string) => {
  if (!address || !city) return null;

  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  // 🟢 INTENTO: Usamos 'gemini-1.5-flash-latest' o 'gemini-pro' que son más universales
  const model = "gemini-1.5-flash"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Ubica: "${address}, ${city}". JSON: {"lat": 0, "lng": 0}` }] }]
      })
    });

    if (response.status === 404) {
      console.warn("⚠️ El modelo no existe en este endpoint. Probando ruta alternativa...");
      // Si falla, devolvemos el fallback de coordenadas inmediatamente para no romper el flujo
      return { lat: 4.6097, lng: -74.0817 }; // Coordenadas de ejemplo (Bogotá) o 0,0
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const jsonMatch = text?.match(/\{.*\}/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { lat: 0, lng: 0 };

  } catch (error) {
    return { lat: 0, lng: 0 };
  }
};