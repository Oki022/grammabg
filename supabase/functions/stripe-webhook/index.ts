import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature')

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SERVICE_ROLE_KEY') || ''
    )

    // 1. ÖDEME TAMAMLANDIĞINDA (Abonelik Başlatma)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const userId = session.client_reference_id;
      const subscriptionId = session.subscription;

      // Stripe'tan bitiş tarihini çekiyoruz
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

      // Frontend için auth.users tablosundaki metadata güncelleniyor
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { 
          plan: 'pro',
          stripe_subscription_id: subscriptionId,
          stripe_period_end: periodEnd, 
          stripe_customer_id: session.customer
        }
      });

      // YENİ EKLEME: İleride hızlıca bulabilmek için profiles tablosuna kaydet
      await supabaseAdmin
        .from('profiles')
        .upsert({ 
          id: userId, 
          stripe_customer_id: session.customer,
          email: session.customer_details?.email 
        });
    }

    // 2. ABONELİK TAMAMEN İPTAL EDİLDİĞİNDE (Dönem bittiğinde)
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
      const customerId = subscription.customer;

      // YENİ HALİ: Tüm listeyi çekmek (listUsers) yerine, profiles tablosundan milisaniyede ID'yi buluyoruz
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile && profile.id) {
        // Kullanıcının mevcut metadata verilerini korumak için auth bilgisini çekiyoruz
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.id);

        if (user) {
          await supabaseAdmin.auth.admin.updateUserById(profile.id, {
            user_metadata: {
              ...user.user_metadata, // Mevcut diğer metadata bilgilerini (display_name vb.) koru
              plan: 'free',
              canceling: false, // İptal süreci bittiği için artık bunu kapatıyoruz
              stripe_subscription_id: null,
              stripe_period_end: null
            }
          });
          console.log(`Kullanıcı ${profile.id} aboneliği bittiği için Free plana çekildi.`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})