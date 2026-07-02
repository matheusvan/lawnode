import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  const signature = req.headers.get("stripe-signature")
  const body = await req.text()
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""
  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return new Response("Webhook Error: " + err.message, { status: 400 })
  }
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object
    const { userId, plano } = pi.metadata
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { plano, plano_ativo: true, creditos: 999999 }
    })
  }
  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
