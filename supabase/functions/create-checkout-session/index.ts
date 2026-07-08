import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { Stripe } from 'https://esm.sh/stripe?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      httpClient: Stripe.createFetchHttpClient(),
    })

    const { planId, ownerId, email } = await req.json()

    // ⚡️ MAPEO DE PRECIOS REAL
    const prices: Record<string, string> = {
      'fundador': 'price_1TRLtjIEYnj3WasrlJfxekzy', // 👈 Pega aquí tu price_... de Stripe
    }

    const priceId = prices[planId]
    if (!priceId) throw new Error('Plan no válido')

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      // Ajusta estas URLs a tu dominio final cuando lo lances
      // 🟢 CAMBIO CRÍTICO: Redirigir al registro con el ID de sesión
      success_url: `${req.headers.get("origin")}/?action=signup&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/precios`,
      metadata: { 
        ownerId: ownerId, // El UUID del anfitrión en tu tabla owners
        planId: planId 
      }
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})