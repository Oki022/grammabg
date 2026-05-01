import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Editor from "@/components/Editor";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";

const Index = () => (
  <div className="relative min-h-screen bg-white text-slate-900 dark:bg-[#050505] dark:text-foreground font-sans overflow-hidden">
    {/* Single atmospheric emerald glow behind all content */}
    <div
      aria-hidden="true"
      className="absolute top-0 left-0 w-full h-[600px] bg-[#10B981]/10 blur-[150px] pointer-events-none -z-10"
    />
    <Header />
    <main className="relative">
      <Hero />
      <Editor />
      <Features />
      <Pricing />
      <FAQ />
    </main>
    <Footer />
    <CookieBanner />
  </div>
);

export default Index;
