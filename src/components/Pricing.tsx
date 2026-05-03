import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type PlanId = "free" | "pro" | "yearly";

type Plan = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
  stripePriceId?: string;
};
const handleCheckout = async (priceId?: string) => {
  if (!priceId) {
    console.log("This is a free plan, there's no need to go to the payment page.");
    // Burada kullanıcıyı direkt uygulamaya yönlendirebilirsin (örneğin: window.location.href = '/app')
    return;
  }

  try {
    // 1. Kendi backend'imize (Supabase Edge Function) istek atıyoruz
    const response = await fetch('https://qpfrckcumebcvwljdxfw.supabase.co/functions/v1/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Eğer kullanıcı giriş yapmışsa, token'ı buraya eklemen çok iyi olur:
        // 'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ priceId }),
    });

    const data = await response.json();

    // 2. Eğer backend bize bir Stripe URL'si verdiyse, müşteriyi oraya şutluyoruz!
    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error("Stripe URL could not be obtained.:", data);
      alert("A problem occurred while going to the payment page.");
    }
  } catch (error) {
    console.error("Payment error:", error);
    alert("The payment process could not be initiated.");
  }
};

const plans: Plan[] = [
  {
    id: "free",
    name: "Free Plan",
    price: "€0",
    period: "/mo",
    description: "Perfect for trying out the AI.",
    features: [
      "5 AI text checks per day", // Sadece metin kutusu için 5 hak olduğunu belli ettik
      "1 Word (.docx) file fix per day", // Dosya yükleme limitinin 1 olduğunu çaktık
      "Standard grammar fixes", 
      "No PDF support" // PDF yüklemek isteyen pro'ya geçecek
    ],
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: "€5.99",
    period: "/mo",
    description: "Unlimited power for professionals.",
    features: [
      "Unlimited AI text checks", 
      "Unlock Unlimited Word & PDF Uploads", 
      "Export to Word & PDF", 
      "History & Custom AI Tones"
    ],
    cta: "Start Pro Now",
    highlighted: true,
    badge: "Popular",
    stripePriceId: "price_1TSdcpH7gfnEgeldc8rd1sR5", // <-- AYLIK KODUN BURADA
  },
  {
    id: "yearly",
    name: "Yearly Pro",
    price: "€49.99",
    period: "/year",
    description: "Ultimate experience & best value.",
    features: [
      "All Pro Plan features", 
      "🚀 Unlock 'Ultimate AI' Engine", 
      "Priority customer support", 
      "Get 2 Months FREE!"
    ],
    cta: "Save Now",
    stripePriceId: "price_1TSddXH7gfnEgeldBwm8sfAV", // <-- YILLIK KODUNU BURAYA YAPIŞTIR
  }
]
const Pricing = ({ showBackButton = false }: { showBackButton?: boolean }) => {
  const { user } = useAuth();
  // Simulated current plan: logged-in users default to "free" unless their
  // metadata marks them as "pro". Logged-out users have no current plan.
  const currentPlan: PlanId | null = user
    ? ((user.user_metadata as { plan?: PlanId } | null)?.plan ?? "free")
    : null;

  return (
    <section id="pricing" className="container py-12 md:py-20">
      
      {/* ŞIK GERİ DÖN BUTONU - Sayfanın en üstünde, sola hizalı */}
{/* ŞIK GERİ DÖN BUTONU - Sadece showBackButton true ise görünür */}
      {showBackButton && (
        <div className="w-full flex justify-end mb-8">
          <Link to="/profile">
            <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      )}

      <div className="text-center mb-14">
        <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-3">
          Plans that fit your <span className="text-gradient-emerald">scale</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Start for free. Upgrade when you need more power.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
        {plans.map((p) => {
          const isCurrent = currentPlan === p.id;
          return (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-7 flex flex-col transition-smooth backdrop-blur ${
                p.highlighted
                  ? "border-primary/60 bg-gradient-card shadow-emerald md:scale-105 md:-my-2"
                  : "border-border bg-card/60 hover:border-primary/30"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-gradient-emerald px-3 py-1 text-xs font-semibold text-primary-foreground shadow-emerald">
                  {p.badge}
                </span>
              )}

              <h3 className="font-display text-xl font-semibold mb-1">{p.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{p.description}</p>

              <div className="flex items-end gap-1 mb-6">
                <span className="font-display text-4xl md:text-5xl font-bold tracking-tight">{p.price}</span>
                <span className="text-muted-foreground mb-1.5">{p.period}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${p.highlighted ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={isCurrent ? "secondary" : p.highlighted ? "emerald" : "outline"}
                size="lg"
                className="w-full"
                disabled={isCurrent}
                aria-disabled={isCurrent}
                onClick={() => handleCheckout(p.stripePriceId)} // <-- İŞTE SİHİRLİ DOKUNUŞ BURADA!
              >
                {isCurrent ? "Current Plan" : p.cta}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Pricing;
