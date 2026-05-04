import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

const EXTRA_PDF_CREDITS_PER_PACK  = 20;
const EXTRA_TEXT_CREDITS_PER_PACK = 100;

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body, signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SERVICE_ROLE_KEY') || ''
    );

    // ── 1. checkout.session.completed ──
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const userId = session.client_reference_id;
      const mode = session.mode;

      if (!userId) {
        console.error('client_reference_id missing');
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Abonelik
      if (mode === 'subscription') {
        const subscriptionId = session.subscription;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            plan: 'pro',
            stripe_subscription_id: subscriptionId,
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

        console.log(`Pro activated for ${userId}`);
      }

      // Tek seferlik ödeme (ekstra kredi)
      if (mode === 'payment') {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

        for (const item of lineItems.data) {
          const meta = item.price?.metadata ?? {};

          if (meta.type === 'extra_pdf_credits') {
            await supabaseAdmin.rpc('add_extra_pdf_credits', {
              p_user_id: userId,
              p_amount: EXTRA_PDF_CREDITS_PER_PACK,
            });
            console.log(`Added ${EXTRA_PDF_CREDITS_PER_PACK} PDF credits to ${userId}`);
          }

          if (meta.type === 'extra_text_credits') {
            await supabaseAdmin.rpc('add_extra_text_credits', {
              p_user_id: userId,
              p_amount: EXTRA_TEXT_CREDITS_PER_PACK,
            });
            console.log(`Added ${EXTRA_TEXT_CREDITS_PER_PACK} text credits to ${userId}`);
          }
        }
      }
    }

    // ── 2. invoice.payment_succeeded (aylık yenileme) ──
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any;
      if (invoice.billing_reason !== 'subscription_cycle') {
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const customerId = invoice.customer;
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('id')
        .eq('stripe_customer_id', customerId).single();

      if (profile?.id) {
        await supabaseAdmin.rpc('reset_monthly_usage', { p_user_id: profile.id });

        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const newPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          await supabaseAdmin.auth.admin.updateUserById(profile.id, {
            user_metadata: { stripe_period_end: newPeriodEnd }
          });
        }
        console.log(`Monthly usage reset for ${profile.id}`);
      }
    }

    // ── 3. customer.subscription.deleted ──
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
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
