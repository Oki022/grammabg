import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Hero = () => {
  const { user } = useAuth();
  return (
    <section id="top" className="relative isolate bg-white dark:bg-[#050505]">
      {/* Persistent emerald glow — always above bg, below text, theme-proof */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 w-full h-[500px] blur-[120px] pointer-events-none z-0"
        style={{ backgroundColor: "rgba(16, 185, 129, 0.15)" }}
      />
      <div className="container relative z-10 py-20 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 mb-8 backdrop-blur animate-fade-in-up">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">AI built for the Bulgarian language</span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6 animate-fade-in-up [animation-delay:80ms] opacity-0 text-slate-900 dark:text-foreground">
          AI-Powered Text Polisher &{" "}
          <span className="text-gradient-emerald">Grammar Corrector</span>
        </h1>

        <p className="max-w-2xl mx-auto text-base md:text-lg text-slate-600 dark:text-muted-foreground leading-relaxed mb-10 animate-fade-in-up [animation-delay:160ms] opacity-0">
          Instantly correct your Bulgarian grammar, or translate from ANY language into flawless, native-sounding text. Adjust your tone with a single click and write with absolute confidence.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up [animation-delay:240ms] opacity-0">
          <Button variant="emerald" size="xl" asChild>
            <a href="#editor" className="scroll-smooth">
              {user ? "Go to Editor" : "Try the Editor — it's free"}
            </a>
          </Button>
          <Button variant="outline" size="xl" asChild>
            <a href="#pricing">See pricing</a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;