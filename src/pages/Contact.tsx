import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, Send, MessageSquare, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    document.title = "Контакт | GRAMMABG.COM";
    const metaRobots = document.createElement('meta');
    metaRobots.name = "robots";
    metaRobots.content = "noindex, nofollow";
    document.getElementsByTagName('head')[0].appendChild(metaRobots);

    return () => {
      const head = document.getElementsByTagName('head')[0];
      if (head && metaRobots) {
        head.removeChild(metaRobots);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error(t.errors.required, { position: "top-center" });
      return;
    }

    setSending(true);

    try {
      // HATA ÇÖZÜMÜ: 'as any' ekleyerek TypeScript'in tabloyu tanımasını sağlıyoruz.
      // Bu, yerel tiplerin henüz güncellenmediği durumlarda kullanılan en temiz Senior yöntemidir.
      const { error } = await supabase
        .from('contact_messages' as any)
        .insert([
          { 
            name: name.trim(), 
            email: email.trim().toLowerCase(), 
            message: message.trim() 
          }
        ]);

      if (error) throw error;

      toast.success(t.contact.successMessage, {
        position: "top-center",
        duration: 3000,
      });

      setName("");
      setEmail("");
      setMessage("");
      
    } catch (error: any) {
      console.error("Contact Error:", error);
      toast.error("Възникна грешка при изпращането. Моля, опитайте отново.", {
        position: "top-center",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="container py-16 md:py-24">
          <div className="mb-6 flex justify-end">
            <Link to="/">
              <Button variant="ghost" size="sm" className="hover:bg-accent/50 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" /> {t.common.back}
              </Button>
            </Link>
          </div>
          <div className="max-w-xl mx-auto text-center mb-10">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-emerald shadow-emerald mb-5">
              <MessageSquare className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-3">
              {t.contact.title} <span className="text-gradient-emerald">{t.contact.titleAccent}</span>
            </h1>
            <p className="text-muted-foreground">{t.contact.subtitle}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-xl rounded-2xl border border-border bg-gradient-card p-6 md:p-8 shadow-card-premium backdrop-blur space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">{t.labels.name}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.contact.namePlaceholder}
                autoComplete="name"
                className="bg-background/40 border-border/50 focus:border-emerald-500/50 transition-all duration-300"
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t.labels.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="office@grammabg.com"
                autoComplete="email"
                className="bg-background/40 border-border/50 focus:border-emerald-500/50 transition-all duration-300"
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">{t.labels.reason}</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.contact.messagePlaceholder}
                className="min-h-[160px] resize-y bg-background/40 border-border/50 focus:border-emerald-500/50 transition-all duration-300"
                disabled={sending}
              />
            </div>

            <Button
              type="submit"
              variant="emerald"
              size="lg"
              disabled={sending}
              className="w-full shadow-emerald font-semibold transition-all active:scale-[0.98]"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.common.processing}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  {t.buttons.submit}
                </span>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5 pt-2">
              <Mail className="h-3.5 w-3.5 text-emerald-500" />
              {t.contact.replyTime}
            </p>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;