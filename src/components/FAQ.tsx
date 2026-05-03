import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How accurate is GrammaBG with Bulgarian grammar?",
    a: "Our model is trained specifically on Bulgarian language data, including modern usage, idioms, and professional writing. It handles complex grammatical cases that generic AI tools miss.",
  },
  {
    q: "Does it just fix typos, or improve style too?",
    a: "Both! GrammaBG corrects spelling and grammar while using advanced AI to restructure sentences, ensuring your writing is clear, professional, and perfectly suited for your audience.",
  },
  {
    q: "What file formats do you support?",
    a: "You can directly paste text or upload Word (.docx) documents for free. Uploading and exporting complex PDF files is a premium feature available on our Pro plan.",
  },
  {
    q: "Is there a daily limit?",
    a: "Free users get 5 AI text corrections and 1 Word (.docx) file fix per day, resetting at midnight. If you are a heavy user, our Pro plan offers unlimited checks, history saving, and advanced export options.",
  },
  {
    q: "Is my text private?",
    a: "Yes. We never store your texts after correction and never use them for training. Your writing stays yours.",
  },
  {
    q: "Can I cancel my Pro plan anytime?",
    a: "Of course. Cancel with a single click — no questions asked, no hidden fees.",
  },
  {
    q: "Do you support other languages?",
    a: "We currently support translating FROM any language INTO flawless Bulgarian. Since our AI is exclusively specialized for the Bulgarian language to ensure native-level perfection, we do not translate Bulgarian into other languages. Our focus is 100% on Bulgarian.",
  },
];

const FAQ = () => (
  <section id="faq" className="container py-20 md:py-28">
    <div className="text-center mb-12">
      <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-3">
        Frequently asked <span className="text-gradient-emerald">questions</span>
      </h2>
    </div>

    <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card/60 backdrop-blur p-2 md:p-4">
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((f, i) => (
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

export default FAQ;
