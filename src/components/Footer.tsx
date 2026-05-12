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
 
type LegalKey = "terms" | "privacy" | "cookies";
 
const Footer = () => {
  const [open, setOpen] = useState<LegalKey | null>(null);
  const { t } = useLanguage();
 
  const legalKeys: LegalKey[] = ["terms", "privacy", "cookies"];
 
  return (
    <footer className="border-t border-border/50 mt-12">
      <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <Logo />
          <p className="text-sm text-muted-foreground">{t.footer.rights}</p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-smooth">
            {t.footer.contact}
          </Link>
          {legalKeys.map((k) => (
            <button
              key={k}
              onClick={() => setOpen(k)}
              className="text-muted-foreground hover:text-foreground transition-smooth capitalize"
            >
              {t.footer.legal[k].label}
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
                  {t.footer.legal[open].title}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {t.footer.lastUpdated}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {t.footer.legal[open].body.map((p, i) => (
                  <p key={i} className="text-sm text-foreground/90 leading-relaxed">{p}</p>
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