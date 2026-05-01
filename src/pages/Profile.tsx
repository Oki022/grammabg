import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, User as UserIcon, Gauge, CreditCard, ArrowLeft, Clock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client"; // DİKKAT: Eğer supabase yolun farklıysa burayı düzelt kanka!

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
  const [remainingCredits, setRemainingCredits] = useState<number>(DAILY_LIMIT); // DB'den gelen gerçek kalan kredi
  const [fetchingCredits, setFetchingCredits] = useState(true);

  // Geri sayım sayacı
  useEffect(() => {
    const id = setInterval(() => setResetIn(formatCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  // Oturum kontrolü
  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [user, loading, navigate]);

  // GERÇEK VERİTABANI BAĞLANTISI (Kredileri çeker)
  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) return;
      try {
        // "as any" diyerek TypeScript'in hata vermesini susturuyoruz
        const { data, error } = await (supabase as any)
          .from('user_credits')
          .select('credits')
          .eq('user_id', user.id)
          .single();

        if (data && data.credits !== undefined) {
          setRemainingCredits(data.credits); 
        }
      } catch (err) {
        console.error("Kredi çekilirken hata oluştu:", err);
      } finally {
        setFetchingCredits(false);
      }
    };

    if (user) {
      fetchCredits();
    }
  }, [user]);

  if (loading || !user || fetchingCredits) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  const displayName =
    (user.user_metadata as { display_name?: string } | null)?.display_name ??
    user.email?.split("@")[0] ??
    "User";
  const email = user.email ?? "—";
  const initial = displayName.charAt(0).toUpperCase();

  // GERÇEK HESAPLAMALAR
  const usedToday = DAILY_LIMIT - remainingCredits; // Veritabanına göre hesaplanan günlük kullanım
  const meta = (user.user_metadata as { plan?: string; canceling?: boolean } | null) ?? null;
  const isPro = meta?.plan === "pro";
  const isCanceling = isPro ? (meta?.canceling ?? false) : false; // Sahte mantık düzeltildi
  const daysRemaining = 12; // Eğer projemizde bitiş tarihi tablosu olursa bunu da gerçek değere bağlarız
  const plan = isPro ? (isCanceling ? "Pro (Canceling)" : "Pro Plan") : "Free Plan";

  const handleCancel = () => {
    toast.success("Subscription cancellation requested");
  };

  const handleReactivate = () => {
    toast.success("Subscription reactivated");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" /> Back
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
              <p className="mt-1.5 font-medium truncate">{email}</p>
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
              <p className="text-xs text-muted-foreground tabular-nums bg-transparent">
                {remainingCredits > 0 ? (
                  <span className="bg-transparent text-muted-foreground">Free credits reset every 24 hours</span>
                ) : (
                  <span className="bg-transparent text-muted-foreground">
                    Resets in{" "}
                    <span className="font-medium text-muted-foreground bg-transparent">{resetIn}</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                Today's usage:{" "}
                <span className="text-foreground font-semibold">
                  {usedToday}/{DAILY_LIMIT}
                </span>
              </p>
              <span className="text-xs text-muted-foreground">
                {remainingCredits} left
              </span>
            </div>
            <Progress value={(usedToday / DAILY_LIMIT) * 100} className="h-2" />
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

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Current plan
                </p>
                <p className="mt-1 font-display text-xl font-semibold">{plan}</p>
              </div>
              {isCanceling && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3 w-3" /> Canceling
                </span>
              )}
            </div>
            
            {/* AKILLI BUTON MANTIĞI */}
            {!isPro ? (
              <Link to="/pricing">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Upgrade to Pro
                </Button>
              </Link>
            ) : isCanceling ? null : (
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleCancel}
              >
                Cancel Subscription
              </Button>
            )}
          </div>

          {isCanceling && (
            <div className="mt-4 rounded-xl border border-border/60 bg-background/30 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-7 w-7 shrink-0 rounded-lg bg-secondary/60 text-muted-foreground flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    Your Pro plan will expire in{" "}
                    <span className="font-semibold text-foreground">{daysRemaining} days</span>. You have full
                    premium access until the end of your billing cycle.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReactivate}
                    className="mt-3 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <RotateCcw className="h-4 w-4" /> Reactivate Subscription
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Profile;
