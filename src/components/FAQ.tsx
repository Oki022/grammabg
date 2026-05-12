import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/i18n/LanguageContext";
 
const FAQ = () => {
  const { t } = useLanguage();
 
  return (
    <section id="faq" className="container py-20 md:py-28">
      <div className="text-center mb-12">
        <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-3">
          {t.faq.title} <span className="text-gradient-emerald">{t.faq.titleAccent}</span>
        </h2>
      </div>
 
      <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card/60 backdrop-blur p-2 md:p-4">
        <Accordion type="single" collapsible className="w-full">
          {t.faq.items.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left font-medium hover:text-primary px-3">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground px-3">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
 
export default FAQ;