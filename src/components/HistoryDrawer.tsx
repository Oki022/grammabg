import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { History, Clock, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth"; 
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface HistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history?: any[];
  onSelect?: (item: any) => void;
}

const toneStyles: Record<string, string> = {
  Standard: "bg-secondary text-secondary-foreground border-border",
  Formal: "bg-primary/15 text-primary border-primary/30",
  Friendly: "bg-accent text-accent-foreground border-accent",
  Academic: "bg-muted text-muted-foreground border-border",
};

const HistoryDrawer = ({ open, onOpenChange, history = [], onSelect }: HistoryDrawerProps) => {
  const { isPro, loading } = useAuth();
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
          {loading ? (
            <p className="text-center text-sm text-muted-foreground pt-10 animate-pulse">
              Veriler kontrol ediliyor...
            </p>
          ) : !isPro ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-lg font-bold">History is a Pro Feature</h3>
                <p className="text-sm text-muted-foreground">
                  Upgrade to Pro to save and access your previous grammar corrections anytime.
                </p>
              </div>
              <Link to="/pricing" onClick={() => onOpenChange(false)}>
                <Button className="bg-gradient-emerald text-white border-none shadow-emerald hover:opacity-90">
                  <Sparkles className="mr-2 h-4 w-4" /> Upgrade Now
                </Button>
              </Link>
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground pt-10">
              No corrections yet. Start typing to see your history!
            </p>
          ) : (
            history.map((item, idx) => {
              const dateObj = new Date(item.created_at);
              const formattedDate = isNaN(dateObj.getTime()) 
                ? "Just now" 
                : dateObj.toLocaleDateString('en-GB', { hour: '2-digit', minute: '2-digit' });

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelect?.(item);
                    onOpenChange(false);
                  }}
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
                    {item.original_text}
                  </p>
                </button>
              );
            })
          )}
        </div>
        
        {isPro && !loading && (
          <div className="p-4 border-t border-border/50 bg-secondary/20">
             <p className="text-[11px] text-center text-muted-foreground/70 italic">
                Showing your latest premium history
             </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default HistoryDrawer;
