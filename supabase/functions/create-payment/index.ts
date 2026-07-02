import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.0.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const { plano, email, userId } = await req.json()
    const precos = { basico: { amount: 5990 }, pro: { amount: 9990 } }
    const preco = precos[plano]
    if (!preco) throw new Error("Plano inválido")
    const paymentIntent = await stripe.paymentIntents.create({
      amount: preco.amount,
      currency: "brl",
      payment_method_types: ["card"],
      metadata: { userId, plano, email },
    })
    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      headers: { ...cors, "Content-Type": "application/json" }, status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...cors, "Content-Type": "application/json" }, status: 400,
    })
  }
})
