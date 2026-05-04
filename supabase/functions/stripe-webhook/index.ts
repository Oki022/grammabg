import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

// Stripe Dashboard'da ürününü tanımlarken bu metadata'yı ekle:
// extra_pdf_credits = "20"  (kaç kredi eklenecek)
const EXTRA_PDF_CREDITS_PER_PACK = 20;

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SERVICE_ROLE_KEY') || ''
    );

    // ════════════════════════════════════════════════════════
    // 1. ÖDEME TAMAMLANDI — checkout.session.completed
    //    a) Abonelik başlatma (Pro plan)
    //    b) Tek seferlik ekstra kredi paketi satın alma
    // ════════════════════════════════════════════════════════
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const userId = session.client_reference_id;
      const mode = session.mode; // 'subscription' | 'payment'

      if (!userId) {
        console.error('checkout.session.completed: client_reference_id missing');
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // ── a) ABONELİK (Pro plan aktivasyonu) ──
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

        console.log(`Pro plan activated for user ${userId}`);
      }

      // ── b) TEK SEFERLİK ÖDEME (Ekstra PDF kredisi paketi) ──
      if (mode === 'payment') {
        // Stripe'ta ürün/fiyat metadata'sına bak
        // Dashboard'da Price metadata: { "type": "extra_pdf_credits" } ekle
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const isExtraPdfPack = lineItems.data.some((item: any) => {
          const meta = item.price?.metadata ?? {};
          return meta.type === 'extra_pdf_credits';
        });

        if (isExtraPdfPack) {
          const { error } = await supabaseAdmin
            .from('user_credits')
            .update({
              extra_pdf_credits: supabaseAdmin.rpc('increment_extra_credits', {
                p_user_id: userId,
                p_amount: EXTRA_PDF_CREDITS_PER_PACK,
              })
            })
            .eq('user_id', userId);

          // RPC kullanmak daha güvenli — ayrı bir SQL fonksiyonu
          await supabaseAdmin.rpc('add_extra_pdf_credits', {
            p_user_id: userId,
            p_amount: EXTRA_PDF_CREDITS_PER_PACK,
          });

          console.log(`Added ${EXTRA_PDF_CREDITS_PER_PACK} extra PDF credits to user ${userId}`);
        }
      }
    }

    // ════════════════════════════════════════════════════════
    // 2. AYLIK YENİLEME — invoice.payment_succeeded
    //    word_count ve pdf_count sıfırla (extra_pdf_credits'e DOKUNMA)
    // ════════════════════════════════════════════════════════
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any;

      // Sadece abonelik yenileme faturalarını işle (ilk ödeme değil)
      if (invoice.billing_reason !== 'subscription_cycle') {
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const customerId = invoice.customer;

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile?.id) {
        await supabaseAdmin.rpc('reset_monthly_usage', { p_user_id: profile.id });

        // Abonelik bitiş tarihini de güncelle
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const newPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          await supabaseAdmin.auth.admin.updateUserById(profile.id, {
            user_metadata: { stripe_period_end: newPeriodEnd }
          });
        }

        console.log(`Monthly usage reset for user ${profile.id}`);
      }
    }

    // ════════════════════════════════════════════════════════
    // 3. ABONELİK İPTAL — customer.subscription.deleted
    //    Dönem bitince Free plana çek
    // ════════════════════════════════════════════════════════
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
      const customerId = subscription.customer;

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

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
          console.log(`User ${profile.id} downgraded to Free plan`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
