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
import { useLanguage } from "@/i18n/LanguageContext";

const Footer = () => {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/50 mt-12">
      <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <Logo />
          <p className="text-sm text-muted-foreground">{t.footer.rights}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-smooth">
            {t.footer.contact}
          </Link>
          <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-smooth">
            {t.footer.legal.terms.label}
          </Link>
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-smooth">
            {t.footer.legal.privacy.label}
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-smooth"
          >
            {t.footer.legal.cookies.label}
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {t.footer.legal.cookies.title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t.footer.lastUpdated}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {t.footer.legal.cookies.body.map((p, i) => (
              <p key={i} className="text-sm text-foreground/90 leading-relaxed">{p}</p>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
};

export default Footer;