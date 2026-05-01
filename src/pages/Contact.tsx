import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Send, MessageSquare, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields", { position: "top-center" });
      return;
    }
    setSending(true);
    // UI-only — simulate a send
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Thanks! We'll get back to you soon. ✅", {
      position: "top-center",
      duration: 2500,
    });
    setName("");
    setEmail("");
    setMessage("");
    setSending(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="container py-16 md:py-24">
          <div className="mb-6 flex justify-end">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
          </div>
          <div className="max-w-xl mx-auto text-center mb-10">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-emerald shadow-emerald mb-5">
              <MessageSquare className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-3">
              Contact & <span className="text-gradient-emerald">Feedback</span>
            </h1>
            <p className="text-muted-foreground">
              Have a suggestion or found a bug? Let us know!
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-xl rounded-2xl border border-border bg-gradient-card p-6 md:p-8 shadow-card-premium backdrop-blur space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                className="min-h-[160px] resize-y"
              />
            </div>

            <Button
              type="submit"
              variant="emerald"
              size="lg"
              disabled={sending}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {sending ? "Sending..." : "Send Message"}
            </Button>

            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              We usually reply within 1–2 business days.
            </p>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
