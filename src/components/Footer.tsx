import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import Logo from "./Logo";

type LegalKey = "terms" | "privacy" | "cookies";

const legalContent: Record<LegalKey, { title: string; body: string[] }> = {
  terms: {
    title: "Terms of Service",
    body: [
      "Welcome to GrammaBG. By using our service you agree to these terms. The service is provided as-is, and we work hard to make it reliable, accurate, and pleasant to use.",
      "You retain full ownership of any text you submit. You agree not to abuse the service, attempt to reverse-engineer it, or use it for unlawful purposes.",
      "Subscriptions renew automatically until cancelled. You may cancel any time from your account settings — no fees, no friction.",
      "We may update these terms occasionally. Material changes will be communicated via email at least 14 days in advance.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "Your privacy matters. We collect the minimum data required to operate the service: account details, billing information, and usage analytics.",
      "Submitted text is processed only for the purpose of returning a corrected version. We do not store it after processing and we never use your text to train models.",
      "We use industry-standard encryption in transit and at rest. You may request export or deletion of your account data at any time.",
      "We don't sell your data. Period.",
    ],
  },
  cookies: {
    title: "Cookie Policy",
    body: [
      "We use a small number of cookies to keep you signed in, remember preferences, and understand how the product is used in aggregate.",
      "Strictly necessary cookies are always on. Analytics cookies are optional and can be disabled at any time from your account settings.",
      "We do not use third-party advertising cookies.",
    ],
  },
};

const Footer = () => {
  const [open, setOpen] = useState<LegalKey | null>(null);

  return (
    <footer className="border-t border-border/50 mt-12">
      <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <Logo />
          <p className="text-sm text-muted-foreground">
            © 2026 GrammarBG. All rights reserved.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link
            to="/contact"
            className="text-muted-foreground hover:text-foreground transition-smooth"
          >
            Contact
          </Link>
          {(Object.keys(legalContent) as LegalKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setOpen(k)}
              className="text-muted-foreground hover:text-foreground transition-smooth capitalize"
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {legalContent[open].title}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Last updated: January 2026
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {legalContent[open].body.map((p, i) => (
                  <p key={i} className="text-sm text-foreground/90 leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </footer>
  );
};

export default Footer;
