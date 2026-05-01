import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { History, Clock } from "lucide-react";

interface HistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history?: any[]; // <--- GERÇEK VERİLERİMİZ İÇİN KABLO GİRİŞİ
}

const toneStyles: Record<string, string> = {
  Standard: "bg-secondary text-secondary-foreground border-border",
  Formal: "bg-primary/15 text-primary border-primary/30",
  Friendly: "bg-accent text-accent-foreground border-accent",
  Academic: "bg-muted text-muted-foreground border-border",
};

// history = [] diyerek veri gelmezse sitenin çökmesini engelledik
const HistoryDrawer = ({ open, onOpenChange, history = [] }: HistoryDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-md bg-background/95 backdrop-blur border-r border-border p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-5 border-b border-border bg-gradient-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-emerald shadow-emerald">
              <History className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-xl font-display font-bold tracking-tight">
                Your History
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recently corrected texts
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          
          {/* Eğer geçmiş boşsa bu mesaj çıkacak */}
          {history.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground pt-10">
              No corrections yet. Start typing to see your history!
            </p>
          ) : (
            /* Geçmiş doluysa listeyi buraya dökecek */
            history.map((item, idx) => {
              // Supabase'den gelen karmaşık tarihi temiz formata çeviriyoruz
              const dateObj = new Date(item.created_at);
              const formattedDate = isNaN(dateObj.getTime()) 
                ? "Just now" 
                : dateObj.toLocaleDateString('en-GB', { hour: '2-digit', minute: '2-digit' });

              return (
                <button
                  key={idx}
                  type="button"
                  className="group w-full text-left rounded-xl border border-border bg-card/60 hover:bg-secondary/60 hover:border-primary/40 p-4 transition-smooth hover:-translate-y-0.5 hover:shadow-card-premium"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      <Clock className="h-3 w-3" />
                      {formattedDate}
                    </div>
                   <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold uppercase tracking-wide ${toneStyles[item.tone || "Standard"]}`}
                    >
                      {item.tone || "Standard"}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/85 line-clamp-2 leading-relaxed group-hover:text-foreground transition-colors">
                    {/* BİZİM GERÇEK VERİTABANI KABLOMUZ */}
                    {item.original_text}
                  </p>
                </button>
              );
            })
          )}

          <div className="pt-4 text-center">
            <p className="text-[11px] text-muted-foreground/70">
              Showing your latest corrections
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HistoryDrawer;