import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Esta es la configuración de seguridad para que tu App pueda hablar con la función
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Manejo de seguridad CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { city, address } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    console.log(`🤖 Generando guía de lujo para: ${address}, ${city}`)

    // 💎 EL LUXURY PROMPT AJUSTADO (Más flexible)
    const prompt = `Actúa como un Concierge experto para la plataforma HostFlow.
    Propiedad en: "${address}, ${city}".

    TAREA: Genera una guía local atractiva con exactamente 5 lugares REALES por categoría.
    
    CRITERIOS:
    1. Si no encuentras lugares "de lujo", busca los más populares, mejor calificados o emblemáticos de la zona.
    2. Amplía el radio de búsqueda hasta 15km si es necesario para completar los 5 lugares.
    3. Asegúrate de incluir el nombre exacto del lugar.

    CATEGORÍAS: Restaurantes, Farmacias, Compras, Cultura, Naturaleza.

    FORMATO (Estricto, una línea por lugar, sin texto extra):
    Categoría || Nombre || Dirección || Rating (ej: 4.8) || Descripción corta y sugerente`;

    // Usamos el alias estable que ya sabemos que funciona en tu cuenta
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})