import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXTRA_PDF_CREDITS_PER_PACK  = 20;
const EXTRA_TEXT_CREDITS_PER_PACK = 100;
const EXTRA_WORD_CREDITS_PER_PACK = 25;

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
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
    }

    const event = JSON.parse(body);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SERVICE_ROLE_KEY') || ''
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const mode = session.mode;

      if (!userId) {
        console.error('client_reference_id missing');
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      if (mode === 'subscription') {
        // Stripe API'den subscription bilgisi al
        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
          headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        const subscription = await subRes.json();
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const planType = session.line_items?.data?.[0]?.price?.id === 'price_1TSddXH7gfnEgeldBwm8sfAV' ? 'yearly' : 'pro';

        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            plan: planType,
            stripe_subscription_id: session.subscription,
            stripe_period_end: periodEnd,
            stripe_customer_id: session.customer,
            canceling: false,
          }
        });

        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          stripe_customer_id: session.customer,
          email: session.customer_details?.email,
        });

        console.log(`Plan activated: ${planType} for ${userId}`);
      }

      if (mode === 'payment') {
        // Line items'ı Stripe API'den al
        const liRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items?expand[]=data.price`, {
          headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        const lineItemsData = await liRes.json();
        const lineItems = lineItemsData.data ?? [];

        for (const item of lineItems) {
          const meta = item.price?.metadata ?? {};
          console.log('Line item meta:', JSON.stringify(meta));

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
        console.log(`Monthly usage reset for ${profile.id}`);
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
          console.log(`${profile.id} downgraded to free`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
