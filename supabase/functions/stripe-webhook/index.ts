import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe?target=deno'

// Clientes — usan variables de entorno del servidor (nunca llegan al frontend)
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

// IMPORTANTE: usamos SERVICE_ROLE_KEY aquí (no anon key)
// porque necesitamos escribir sin restricciones de RLS
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Firma de webhook ausente', { status: 400 })
  }

  // Leemos el body como texto RAW — obligatorio para verificar la firma de Stripe
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('❌ Firma inválida:', err.message)
    return new Response('Firma inválida', { status: 400 })
  }

  try {
    switch (event.type) {

      // ✅ PAGO COMPLETADO — el más importante
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const ownerId = session.metadata?.ownerId
        const planId  = session.metadata?.planId || 'fundador'

        if (!ownerId) {
          console.error('❌ checkout.session.completed sin ownerId en metadata')
          break
        }

        // Obtenemos los detalles de la suscripción para la fecha de vencimiento
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

        const { error } = await supabase
          .from('owners')
          .update({
            stripe_customer_id:  session.customer as string,
            subscription_status: 'active',
            plan_type:           planId,
            current_period_end:  new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', ownerId)

        if (error) console.error('❌ Error actualizando owner:', error)
        else console.log(`✅ Suscripción activada para owner ${ownerId}`)

        break
      }

      // 🔄 SUSCRIPCIÓN RENOVADA O MODIFICADA
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription

        const { error } = await supabase
          .from('owners')
          .update({
            subscription_status: sub.status,
            current_period_end:  new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_customer_id', sub.customer as string)

        if (error) console.error('❌ Error en subscription.updated:', error)
        else console.log(`🔄 Suscripción actualizada: ${sub.status}`)

        break
      }

      // ❌ SUSCRIPCIÓN CANCELADA
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription

        const { error } = await supabase
          .from('owners')
          .update({
            subscription_status: 'canceled',
            current_period_end:  new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_customer_id', sub.customer as string)

        if (error) console.error('❌ Error en subscription.deleted:', error)
        else console.log(`❌ Suscripción cancelada para customer ${sub.customer}`)

        break
      }

      // 💳 PAGO FALLIDO — opcional pero recomendado
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        await supabase
          .from('owners')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', invoice.customer as string)

        console.warn(`⚠️ Pago fallido para customer ${invoice.customer}`)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('❌ Error en el handler del webhook:', err)
    return new Response('Error interno del webhook', { status: 500 })
  }
})