import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Hero = () => {
  const { user } = useAuth();
  return (
    <section id="top" className="relative isolate bg-white dark:bg-[#050505]">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 w-full h-[500px] blur-[120px] pointer-events-none z-0"
        style={{ backgroundColor: "rgba(16, 185, 129, 0.15)" }}
      />

      <div className="container relative z-10 py-20 md:py-32 text-center">

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 mb-8 backdrop-blur animate-fade-in-up">
          <span className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Corporate Document Standard
          </span>
        </div>

        {/* H1 */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6 animate-fade-in-up [animation-delay:80ms] opacity-0 text-slate-900 dark:text-foreground">
          Flawless Bulgarian.{" "}
          <span className="text-gradient-emerald">Format Preserved.</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-base md:text-lg text-slate-600 dark:text-muted-foreground leading-relaxed mb-4 animate-fade-in-up [animation-delay:160ms] opacity-0">
          Your Word and PDF documents are corrected linguistically — without
          touching the tables, logo, signatures, or page layout.
        </p>

        {/* Trust line */}
        <p className="max-w-xl mx-auto text-xs text-muted-foreground/50 tracking-widest uppercase mb-10 animate-fade-in-up [animation-delay:200ms] opacity-0">
          Law Firms &nbsp;·&nbsp; Export Companies &nbsp;·&nbsp; Academic Institutions &nbsp;·&nbsp; C-Level
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up [animation-delay:240ms] opacity-0">
          <Button variant="emerald" size="xl" asChild>
            <a href="#editor" className="scroll-smooth">
              {user ? "Go to Editor" : "Try for Free →"}
            </a>
          </Button>
          <Button variant="outline" size="xl" asChild>
            <a href="#pricing">See pricing</a>
          </Button>
        </div>

        {/* Before / After cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto animate-fade-in-up [animation-delay:320ms] opacity-0">
          
          {/* Standard Tools */}
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-7 text-left">
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <X className="h-3 w-3 text-red-400" strokeWidth={3} />
              </span>
              <span className="text-sm font-semibold text-red-400 tracking-wide">Standard Tools</span>
            </div>
            <ul className="space-y-3">
              {["Tables collapse", "Logo disappears", "Formatting is destroyed"].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                    <X className="h-3 w-3 text-red-400" strokeWidth={3} />
                  </span>
                  <span className="text-foreground/70">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* GrammaBG */}
          <div className="rounded-2xl border border-primary/60 bg-gradient-card shadow-emerald backdrop-blur p-7 text-left">
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-sm font-semibold text-primary tracking-wide">GrammaBG</span>
            </div>
            <ul className="space-y-3">
              {["Tables stay intact", "Logo stays in place", "Only errors are corrected"].map((f) => (
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