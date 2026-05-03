import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, User as UserIcon, Gauge, CreditCard, ArrowLeft, Clock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

const DAILY_LIMIT = 5;

const formatCountdown = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = Math.max(0, midnight.getTime() - now.getTime());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [resetIn, setResetIn] = useState(formatCountdown);
  const [remainingCredits, setRemainingCredits] = useState<number>(DAILY_LIMIT);
  const [fetchingCredits, setFetchingCredits] = useState(true);

  // --- MANTIK HESAPLAMALARI ---
  const meta = (user?.user_metadata as { plan?: string; canceling?: boolean; stripe_subscription_id?: string; stripe_period_end?: string; display_name?: string } | null) ?? null;
  const isPro = meta?.plan === "pro";
  const isCanceling = meta?.canceling === true;
  
  const periodEnd = meta?.stripe_period_end;
  // Test için hemen altına şunu ekle (Konsolda ne yazdığına bakalım):
  console.log("Gelen Tarih:", periodEnd);
  const daysLeft = periodEnd 
    ? Math.ceil((new Date(periodEnd).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : 0;

  const planLabel = isPro ? (isCanceling ? "Pro (Canceling)" : "Pro Plan") : "Free Plan";
  const usedToday = isPro ? 0 : DAILY_LIMIT - remainingCredits;

  // --- FONKSİYONLAR ---
  
  const handleCancelSubscription = async () => {
    const subId = meta?.stripe_subscription_id;
    
    if (!subId) {
      toast.error("Subscription ID not found. Please refresh.");
      return;
    }

    if (!confirm("Are you sure? Your Pro features will remain active until the end of the period.")) return;

    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { subscriptionId: subId }
      });

      if (error) throw error;

      // Metadata'yı da güncelleyelim ki UI hemen değişsin
      await supabase.auth.updateUser({ data: { canceling: true } });
      
      toast.success(`Canceled! Plan ends on ${data.cancel_at}`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error("Cancel error:", err);
      toast.error("Failed to cancel subscription.");
    }
  };

  const handleReactivate = async () => {
    try {
      // Not: Reactivate için ayrı bir Stripe Edge Function yazmadıysan 
      // bu sadece UI'da canceling'i false yapar. Gerçek çözüm için Stripe'tan 
      // cancel_at_period_end: false yapılmalıdır.
      await supabase.auth.updateUser({ data: { canceling: false } });
      toast.success("Your Pro subscription has been reactivated!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error("Something went wrong.");
    }
  };

  // --- EFFECTLER ---

  useEffect(() => {
    const id = setInterval(() => setResetIn(formatCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) return;
      try {
        const { data, error } = await (supabase as any)
          .from('user_credits')
          .select('credits')
          .eq('user_id', user.id)
          .single();

        if (data && data.credits !== undefined) {
          setRemainingCredits(data.credits); 
        }
      } catch (err) {
        console.error("Credits fetch error:", err);
      } finally {
        setFetchingCredits(false);
      }
    };
    fetchCredits();
  }, [user]);

  if (loading || !user || fetchingCredits) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  const displayName = meta?.display_name ?? user.email?.split("@")[0] ?? "User";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-3xl py-12 md:py-16 space-y-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            Your <span className="text-gradient-emerald">profile</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Manage your account, usage and subscription.
          </p>
        </div>

        {/* Account */}
        <Card className="p-6 border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-emerald flex items-center justify-center text-lg font-semibold text-primary-foreground shadow-emerald shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold">Account</h2>
              <p className="text-xs text-muted-foreground">Your basic information</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <UserIcon className="h-3.5 w-3.5" /> User Name
              </div>
              <p className="mt-1.5 font-medium truncate">{displayName}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Email
              </div>
              <p className="mt-1.5 font-medium truncate">{user.email}</p>
            </div>
          </div>
        </Card>

        {/* Usage */}
        <Card className="p-6 border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary text-primary flex items-center justify-center">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Daily Usage</h2>
              <div className="text-xs text-muted-foreground tabular-nums bg-transparent">
                {isPro ? (
                  <span className="text-emerald-500 font-medium">Unlimited Pro Access</span>
                ) : remainingCredits > 0 ? (
                  <span>Free credits reset every 24 hours</span>
                ) : (
                  <span>
                    Resets in <span className="font-medium">{resetIn}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                Today's usage:{" "}
                <span className="text-foreground font-semibold">
                  {isPro ? "Unlimited" : `${usedToday}/${DAILY_LIMIT}`}
                </span>
              </p>
              <span className="text-xs text-muted-foreground">
                {isPro ? "∞" : remainingCredits} left
              </span>
            </div>
            <Progress value={isPro ? 100 : (usedToday / DAILY_LIMIT) * 100} className={`h-2 ${isPro ? 'bg-emerald-500/20' : ''}`} />
          </div>
        </Card>

        {/* Subscription */}
        <Card className="p-6 border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary text-primary flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Subscription Management</h2>
              <p className="text-xs text-muted-foreground">Your active plan</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</p>
                <p className="mt-1 font-display text-xl font-semibold">{planLabel}</p>
              </div>
              
              {!isPro ? (
                <Link to="/pricing">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Upgrade to Pro
                  </Button>
                </Link>
              ) : isCanceling ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3 w-3" /> Canceling
                </span>
              ) : (
                <Button
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleCancelSubscription}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>

            {isCanceling && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground">
                Your Pro plan is active for <span className="font-semibold text-foreground">{daysLeft} more days</span>. 
                After that you'll be moved to the Free plan.
                <button 
                  onClick={handleReactivate}
                  className="ml-2 text-primary underline hover:no-underline font-medium"
                >
                  Reactivate
                </button>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Profile;