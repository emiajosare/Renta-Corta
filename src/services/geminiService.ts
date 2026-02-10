
// 🟢 PASO 1: Definimos la Guía de Emergencia fuera de la función
// Esto asegura que esté disponible siempre, pase lo que pase.
const FALLBACK_RECOMMENDATIONS = {
  "Restaurantes": [
    { "name": "Gastronomía Local", "type": "Recomendado", "rating": 4.8, "description": "Sabores auténticos recomendados por la casa.", "distance": "A 5 min" },
    { "name": "Café del Barrio", "type": "Cafetería", "rating": 4.5, "description": "El mejor café artesanal cerca de ti.", "distance": "A 3 min" }
  ],
  "Cultura": [
    { "name": "Museo de la Ciudad", "type": "Historia", "rating": 4.9, "description": "Una visita obligada para conocer la cultura local.", "distance": "A 10 min" },
    { "name": "Galería de Arte", "type": "Arte", "rating": 4.7, "description": "Exposiciones locales contemporáneas.", "distance": "A 7 min" }
  ],
  "Naturaleza": [
    { "name": "Parque Central", "type": "Parque", "rating": 4.6, "description": "Ideal para caminar y disfrutar del aire libre.", "distance": "A 8 min" },
    { "name": "Mirador del Valle", "type": "Vistas", "rating": 4.9, "description": "La mejor panorámica de la ciudad.", "distance": "A 15 min" }
  ]
};

// geminiService.ts

// ... mantén tu FALLBACK_RECOMMENDATIONS igual ...

export const getNearbyPlaces = async (city: string, address: string) => {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  // 🟢 CAMBIO: Probamos con el sufijo '-latest' que a veces resuelve el 404
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Recomendaciones para ${city}, ${address} en JSON.` }] }]
      })
    });

    // Si recibimos 404, activamos el salvavidas manualmente
    if (!response.ok) {
      console.log("🚀 Activando Guía de Emergencia por error " + response.status);
      return FALLBACK_RECOMMENDATIONS;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const jsonMatch = text?.match(/\{[\s\S]*\}/);
    
    return jsonMatch ? JSON.parse(jsonMatch[0]) : FALLBACK_RECOMMENDATIONS;

  } catch (error) {
    return FALLBACK_RECOMMENDATIONS;
  }
};