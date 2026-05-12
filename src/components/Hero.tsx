import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
 
const Hero = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
 
  return (
    <section id="top" className="relative isolate bg-white dark:bg-[#050505]">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 w-full h-[500px] blur-[120px] pointer-events-none z-0"
        style={{ backgroundColor: "rgba(16, 185, 129, 0.15)" }}
      />
 
      <div className="container relative z-10 py-20 md:py-32 text-center">
 
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 mb-8 backdrop-blur animate-fade-in-up">
          <span className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            {t.hero.eyebrow}
          </span>
        </div>
 
        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6 animate-fade-in-up [animation-delay:80ms] opacity-0 text-slate-900 dark:text-foreground">
          {t.hero.h1}{" "}
          <span className="text-gradient-emerald">{t.hero.h1Accent}</span>
        </h1>
 
        <p className="max-w-2xl mx-auto text-base md:text-lg text-slate-600 dark:text-muted-foreground leading-relaxed mb-4 animate-fade-in-up [animation-delay:160ms] opacity-0">
          {t.hero.subtitle}
        </p>
 
        <p className="max-w-xl mx-auto text-xs text-muted-foreground/50 tracking-widest uppercase mb-10 animate-fade-in-up [animation-delay:200ms] opacity-0">
          {t.hero.trustLine}
        </p>
 
        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up [animation-delay:240ms] opacity-0">
          <Button variant="emerald" size="xl" asChild>
            <a href="#editor" className="scroll-smooth">
              {user ? t.hero.goToEditor : t.hero.tryFree}
            </a>
          </Button>
          <Button variant="outline" size="xl" asChild>
            <a href="#pricing">{t.hero.seePricing}</a>
          </Button>
        </div>
 
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto animate-fade-in-up [animation-delay:320ms] opacity-0">
          
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-7 text-left">
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <X className="h-3 w-3 text-red-400" strokeWidth={3} />
              </span>
              <span className="text-sm font-semibold text-red-400 tracking-wide">{t.hero.standardTools}</span>
            </div>
            <ul className="space-y-3">
              {t.hero.badFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                    <X className="h-3 w-3 text-red-400" strokeWidth={3} />
                  </span>
                  <span className="text-foreground/70">{f}</span>
                </li>
              ))}
            </ul>
          </div>
 
          <div className="rounded-2xl border border-primary/60 bg-gradient-card shadow-emerald backdrop-blur p-7 text-left">
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-sm font-semibold text-primary tracking-wide">{t.hero.grammaBG}</span>
            </div>
            <ul className="space-y-3">
              {t.hero.goodFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
          </div>
 
        </div>
 
      </div>
    </section>
  );
};
 
export default Hero;
 