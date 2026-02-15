export const getCoordinates = async (address: string, city: string) => {
  try {
    const query = encodeURIComponent(`${address}, ${city}`);
    // Usamos Nominatim (OpenStreetMap) - Gratuito y estable
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      console.log("📍 Coordenadas encontradas via OSM:", data[0].lat, data[0].lon);
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error("❌ Error en Geocoding:", error);
    return null;
  }
};