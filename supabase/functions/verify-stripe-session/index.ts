import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

// SERVICE_ROLE_KEY para bypasear RLS en la actualización
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { sessionId } = await req.json()
    if (!sessionId) throw new Error('sessionId requerido')

    // 1. Verificamos el pago directamente con Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Pago no completado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
      )
    }

    const ownerId = session.metadata?.ownerId
    const planId  = session.metadata?.planId || 'fundador'

    if (!ownerId) throw new Error('ownerId no encontrado en metadata de Stripe')

    // 2. Actualizamos subscription_status con SERVICE_ROLE_KEY (bypasea RLS)
    const { error: updateError } = await supabase
      .from('owners')
      .update({
        subscription_status: 'active',
        plan_type: planId,
        stripe_customer_id: session.customer as string,
      })
      .eq('id', ownerId)

    if (updateError) throw new Error(`Error actualizando owner: ${updateError.message}`)

    // 3. Devolvemos el owner ya actualizado
    const { data: ownerData, error: ownerError } = await supabase
      .from('owners')
      .select('*')
      .eq('id', ownerId)
      .single()

    if (ownerError) throw new Error(`Error cargando owner: ${ownerError.message}`)

    return new Response(
      JSON.stringify({ owner: ownerData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})