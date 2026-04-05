const API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();

export const getNearbyPlaces = async (city: string, address: string) => {
  // Usamos los alias exactos de tu lista de modelos disponibles
  const modelsToTry = ["gemini-flash-latest", "gemini-pro-latest", "gemini-2.0-flash"];
  
  const prompt = `Actúa como guía local experto para HostFlow. 
  Para la ubicación "${address}, ${city}", sugiere lugares REALES.
  Genera 5 lugares por categoría: Restaurantes, Farmacias, Compras, Cultura, Naturaleza.
  FORMATO: Categoría || Nombre || Dirección || 4.5 || Descripción breve`;

  for (const modelName of modelsToTry) {
    try {
      console.log(`🤖 Intentando con modelo: ${modelName}...`);
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      // Si el modelo no existe (404) o está saturado (429), probamos el siguiente
      if (response.status === 404 || response.status === 429) {
        console.warn(`⚠️ Modelo ${modelName} no disponible (${response.status}). Reintentando...`);
        continue; 
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      
      console.log(`✅ ¡Éxito con ${modelName}!`);
      return parseResponse(text);

    } catch (error: any) {
      console.error(`❌ Error en ${modelName}:`, error.message);
    }
  }

  return { "Restaurantes": [], "Farmacias": [], "Compras": [], "Cultura": [], "Naturaleza": [] };
};

function parseResponse(text: string) {
  const cleanText = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').replace(/\*/g, '').trim();
  const lines = cleanText.split('\n').filter(l => l.includes('||'));
  const categorized: any = { "Restaurantes": [], "Farmacias": [], "Compras": [], "Cultura": [], "Naturaleza": [] };

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
          distance: "Cerca"
        });
      }
    }
  });
  return categorized;
}