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
};

const plans: Plan[] = [
  {
    id: "free",
    name: "Free Plan",
    price: "€0",
    period: "/mo",
    description: "Perfect for trying out the AI.",
    features: ["5 AI checks per day", "Standard grammar fixes", "Word (.docx) support only"],
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: "€5.99",
    period: "/mo",
    description: "Unlimited power for professionals.",
    features: ["Unlimited AI checks", "Unlock PDF Upload & Export", "History & Custom AI Tones"],
    cta: "Start Pro Now",
    highlighted: true,
    badge: "Popular",
  },
  {
    id: "yearly",
    name: "Yearly Pro",
    price: "€49.99",
    period: "/year",
    description: "Best value for power users.",
    features: ["All Pro Plan features", "Billed annually (€49.99/year)", "Save 30% compared to monthly"],
    cta: "Save Now",
  },
];

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
