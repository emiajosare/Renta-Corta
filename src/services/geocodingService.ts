export const getCoordinates = async (address: string, city: string) => {
  try {
    const query = encodeURIComponent(`${address}, ${city}`);
    
    // ✅ Usamos el proxy de OSM que sí permite CORS desde localhost
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          // Header requerido por Nominatim para identificar la app
          'Accept': 'application/json',
          'Accept-Language': 'es'
        }
      }
    );

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    
    const data = await response.json();

    if (data && data.length > 0) {
      console.log("📍 Coordenadas encontradas:", data[0].lat, data[0].lon);
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    console.warn("📍 No se encontraron coordenadas para:", address, city);
    return null;

  } catch (error) {
    // ✅ CORREGIDO: El error de geocoding NO detiene el flujo principal
    // Las recomendaciones de Gemini funcionan sin coordenadas
    console.warn("⚠️ Geocoding no disponible (continuando sin coordenadas):", error);
    return null;
  }
};