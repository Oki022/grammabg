import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "grammabg-cookie-consent";

type Preferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>({
    necessary: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const save = (value: Preferences | "accepted-all" | "declined") => {
    localStorage.setItem(
      STORAGE_KEY,
      typeof value === "string" ? value : JSON.stringify(value),
    );
    setVisible(false);
    setPrefsOpen(false);
  };

  if (!visible && !policyOpen) return null;

  return (
    <>
      {visible && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6 animate-fade-in-up"
        >
          <div className="mx-auto max-w-5xl rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-card-premium">
            <div className="flex flex-col lg:flex-row lg:items-center gap-5 p-5 sm:p-6">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-emerald shadow-emerald">
                  <Cookie className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-base font-semibold text-foreground mb-1">
                    Your privacy, your choice
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We use cookies to improve your browsing experience, analyze
                    site traffic, and serve tailored content. By clicking{" "}
                    <span className="text-foreground font-medium">
                      "Accept All"
                    </span>
                    , you consent to our use of cookies.{" "}
                    <button
                      onClick={() => setPolicyOpen(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Cookie Policy
                    </button>
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 lg:shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrefsOpen(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Manage Preferences
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => save("declined")}
                >
                  Decline
                </Button>
                <Button
                  variant="emerald"
                  size="sm"
                  onClick={() => save("accepted-all")}
                >
                  Accept All
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Policy dialog */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Cookie Policy
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Last updated: January 2026
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-sm text-foreground/90 leading-relaxed">
            <p>
              We use a small number of cookies to keep you signed in, remember
              preferences, and understand how the product is used in aggregate.
            </p>
            <p>
              Strictly necessary cookies are always on. Analytics cookies are
              optional and can be disabled at any time from this banner or your
              account settings.
            </p>
            <p>We do not use third-party advertising cookies.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preferences dialog */}
      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Cookie Preferences
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Choose which cookies you'd like to allow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Necessary</p>
                <p className="text-xs text-muted-foreground">
                  Required for the site to function. Always on.
                </p>
              </div>
              <Switch checked disabled />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Analytics</p>
                <p className="text-xs text-muted-foreground">
                  Helps us understand how the product is used.
                </p>
              </div>
              <Switch
                checked={prefs.analytics}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
              />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Marketing</p>
                <p className="text-xs text-muted-foreground">
                  Used to personalize content and offers.
                </p>
              </div>
              <Switch
                checked={prefs.marketing}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => save("declined")}>
              Decline All
            </Button>
            <Button variant="emerald" size="sm" onClick={() => save(prefs)}>
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieBanner;
