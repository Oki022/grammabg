import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

const LanguageSwitcher = ({ className }: Props) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card/60 p-0.5 backdrop-blur",
        className,
      )}
    >
      {(["bg", "en"] as const).map((lng) => {
        const active = language === lng;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => setLanguage(lng)}
            aria-pressed={active}
            className={cn(
              "px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full transition-smooth",
              active
                ? "bg-gradient-emerald text-primary-foreground shadow-emerald"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {lng}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;