import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXTRA_PDF_CREDITS_PER_PACK  = 20;
const EXTRA_TEXT_CREDITS_PER_PACK = 100;
const EXTRA_WORD_CREDITS_PER_PACK = 25;

// Yeni Stripe Price ID'lerini buraya sabitledik
const YEARLY_PRICE_ID = 'price_1TWFLnH7gfnEgeldzNaQqiSl';
const MONTHLY_PRICE_ID = 'price_1TWFL9H7gfnEgeldjYyRNeNZ';

// Stripe signature verification - manuel olarak yapiyoruz
async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const parts = signature.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
    const v1 = parts.find(p => p.startsWith('v1='))?.slice(3);
    if (!timestamp || !v1) return false;

    const signedPayload = `${timestamp}.${body}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    return computed === v1;
  } catch {
    return false;
  }
}

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature') || '';
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';

  try {
    const body = await req.text();

    // Signature dogrula
    const valid = await verifyStripeSignature(body, signature, webhookSecret);
    if (!valid) {
      console.error('Invalid Stripe Signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
    }

    const event = JSON.parse(body);
    console.log(`Processing Stripe Event: ${event.type}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SERVICE_ROLE_KEY') || ''
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const mode = session.mode;

      if (!userId) {
        console.error('client_reference_id missing in session metadata');
        return new Response(JSON.stringify({ received: true, warning: 'No userId attached' }), { status: 200 });
      }

      if (mode === 'subscription') {
        try {
          // Stripe API'den subscription bilgisi al
          const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
            headers: { 'Authorization': `Bearer ${stripeKey}` }
          });
          const subscription = await subRes.json();
let periodEnd;
if (subscription.current_period_end) {
  periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
} else {
  console.error("Stripe Hatası (Muhtemelen Secret Key eksik):", subscription);
  const fallback = new Date();
  fallback.setMonth(fallback.getMonth() + 1);
  periodEnd = fallback.toISOString();
}
          
          // Satın alınan ürünü (price ID) bul
          const subRes2 = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items`, {
             headers: { 'Authorization': `Bearer ${stripeKey}` }
          });
          const lineItems2 = await subRes2.json();
          const priceId = lineItems2.data?.[0]?.price?.id;

          console.log(`Detected Price ID: ${priceId}`);

          // Plan tipini açıkça ve güvenli bir şekilde belirle
          let planType = 'pro'; // Varsayılan olarak aylık plan (pro) kabul edirdelim
          if (priceId === YEARLY_PRICE_ID) {
            planType = 'yearly';
          } else if (priceId === MONTHLY_PRICE_ID) {
            planType = 'pro'; 
          } else {
            console.warn(`Unrecognized Price ID received: ${priceId}. Defaulting to 'pro'.`);
          }

          // Supabase Admin ile kullanıcı metadatasını güncelle
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
              plan: planType,
              stripe_subscription_id: session.subscription,
              stripe_period_end: periodEnd,
              stripe_customer_id: session.customer,
              canceling: false,
            }
          });

          if (updateError) {
             console.error(`Auth update error for user ${userId}:`, updateError.message);
             throw new Error(updateError.message);
          }

          // Profili güncelle
          const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
            id: userId,
            stripe_customer_id: session.customer,
            email: session.customer_details?.email,
          });

          if (profileError) {
             console.error(`Profile upsert error for user ${userId}:`, profileError.message);
             throw new Error(profileError.message);
          }

          console.log(`✅ SUCCESS: Plan activated - ${planType} for User ID: ${userId}`);
        } catch (err: any) {
          console.error('Subscription processing error:', err.message);
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }

      if (mode === 'payment') {
        try {
          const liRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items?expand[]=data.price`, {
            headers: { 'Authorization': `Bearer ${stripeKey}` }
          });
          const lineItemsData = await liRes.json();
          const lineItems = lineItemsData.data ?? [];

          for (const item of lineItems) {
            const meta = item.price?.metadata ?? {};
            console.log('Line item metadata for payment:', JSON.stringify(meta));

            if (meta.type === 'extra_pdf_credits') {
              await supabaseAdmin.rpc('add_extra_pdf_credits', {
                p_user_id: userId, p_amount: EXTRA_PDF_CREDITS_PER_PACK,
              });
              console.log(`Added ${EXTRA_PDF_CREDITS_PER_PACK} PDF credits to ${userId}`);
            }

            if (meta.type === 'extra_text_credits') {
              await supabaseAdmin.rpc('add_extra_text_credits', {
                p_user_id: userId, p_amount: EXTRA_TEXT_CREDITS_PER_PACK,
              });
              console.log(`Added ${EXTRA_TEXT_CREDITS_PER_PACK} text credits to ${userId}`);
            }

            if (meta.type === 'extra_word_credits') {
              await supabaseAdmin.rpc('add_extra_word_credits', {
                p_user_id: userId, p_amount: EXTRA_WORD_CREDITS_PER_PACK,
              });
              console.log(`Added ${EXTRA_WORD_CREDITS_PER_PACK} word credits to ${userId}`);
            }
          }
        } catch (err: any) {
           console.error('Payment processing error:', err.message);
        }
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      if (invoice.billing_reason !== 'subscription_cycle') {
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const customerId = invoice.customer;
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('id')
        .eq('stripe_customer_id', customerId).single();

      if (profile?.id) {
        await supabaseAdmin.rpc('reset_monthly_usage', { p_user_id: profile.id });

        if (invoice.subscription) {
          const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${invoice.subscription}`, {
            headers: { 'Authorization': `Bearer ${stripeKey}` }
          });
          const subscription = await subRes.json();
          const newPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          await supabaseAdmin.auth.admin.updateUserById(profile.id, {
            user_metadata: { stripe_period_end: newPeriodEnd }
          });
        }
        console.log(`✅ Monthly usage reset for ${profile.id}`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('id')
        .eq('stripe_customer_id', subscription.customer).single();

      if (profile?.id) {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        if (user) {
          await supabaseAdmin.auth.admin.updateUserById(profile.id, {
            user_metadata: {
              ...user.user_metadata,
              plan: 'free',
              canceling: false,
              stripe_subscription_id: null,
              stripe_period_end: null,
            }
          });
          console.log(`🚫 ${profile.id} downgraded to free plan`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error: any) {
    console.error('Critical Webhook error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});