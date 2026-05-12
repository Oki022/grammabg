import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type PlanId = "free" | "pro" | "yearly";

type Plan = {
  id: PlanId;
  price: string;
  period: string;
  badge?: string;
  highlighted?: boolean;
  stripePriceId?: string;
  originalPrice?: string;
  saving?: string;
  monthlyEquiv?: string;
};

const handleUpgrade = async (priceId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Authentication Required: Please log in to upgrade your plan.");
      return;
    }
    const response = await fetch('https://qpfrckcumebcvwljdxfw.supabase.co/functions/v1/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ priceId }),
    });
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("A problem occurred while going to the payment page.");
    }
  } catch (error) {
    alert("The payment process could not be initiated.");
  }
};

const handleCheckout = async (priceId?: string) => {
  if (!priceId) { window.location.href = '/'; return; }
  await handleUpgrade(priceId);
};

const plans: Plan[] = [
  {
    id: "free",
    price: "€0",
    period: "/mo",
  },
  {
    id: "pro",
    price: "€12",
    period: "/mo",
    highlighted: true,
    badge: "popular",
    stripePriceId: "price_1TWFL9H7gfnEgeldjYyRNeNZ",
  },
  {
    id: "yearly",
    price: "€99",
    period: "/year",
    originalPrice: "€144",
    saving: "31%",
    monthlyEquiv: "€8.25",
    stripePriceId: "price_1TWFLnH7gfnEgeldzNaQqiSl",
  }
];

const Pricing = ({ showBackButton = false }: { showBackButton?: boolean }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const currentPlan: PlanId | null = user
    ? ((user.user_metadata as { plan?: PlanId } | null)?.plan ?? "free")
    : null;

  return (
    <section id="pricing" className="container py-12 md:py-20">
      
      {showBackButton && (
        <div className="w-full flex justify-end mb-8">
          <Link to="/profile">
            <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              {t.common.back}
            </Button>
          </Link>
        </div>
      )}

      <div className="text-center mb-14">
        <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-3">
          {t.pricing.title} <span className="text-gradient-emerald">{t.pricing.titleAccent}</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">{t.pricing.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
        {plans.map((p) => {
          const isCurrent = currentPlan === p.id;
          const plan = t.pricing.plans[p.id];
          return (
            <div
              key={p.id}
              className={`relative rounded-2xl border p-7 flex flex-col transition-smooth backdrop-blur ${
                p.highlighted
                  ? "border-primary/60 bg-gradient-card shadow-emerald md:scale-105 md:-my-2"
                  : "border-border bg-card/60 hover:border-primary/30"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-gradient-emerald px-3 py-1 text-xs font-semibold text-primary-foreground shadow-emerald">
                  {t.pricing.popular}
                </span>
              )}

              <h3 className="font-display text-xl font-semibold mb-1">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>

              <div className="flex items-end gap-1 mb-1">
                <span className="font-display text-4xl md:text-5xl font-bold tracking-tight">{p.price}</span>
                <span className="text-muted-foreground mb-1.5">{p.period}</span>
              </div>

              {/* Yıllık plan için ekstra bilgi */}
              {p.originalPrice && (
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-sm text-muted-foreground line-through">{p.originalPrice}</span>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">-{p.saving}</span>
                  <span className="text-xs text-muted-foreground">{p.monthlyEquiv}/mo</span>
                </div>
              )}
              {!p.originalPrice && <div className="mb-6" />}

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
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
                onClick={() => handleCheckout(p.stripePriceId)}
              >
                {isCurrent ? t.pricing.currentPlan : plan.cta}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Pricing;