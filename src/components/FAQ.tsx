import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Does GrammaBG preserve the formatting of my Word and PDF files?",
    a: "Yes — this is our core differentiator. GrammaBG corrects your Bulgarian text without touching tables, logos, signatures, or page layout. The document you receive back is identical in structure to the one you uploaded.",
  },
  {
    q: "How is GrammaBG different from Google Translate or standard AI tools?",
    a: "Standard tools break your document's formatting when processing it. GrammaBG is built specifically to separate language correction from document structure — so your corporate layout is never compromised.",
  },
  {
    q: "What file formats are supported?",
    a: "You can paste text directly or upload Word (.docx) documents on the free plan. PDF correction with full layout preservation is available on the Pro plan.",
  },
  {
    q: "Is it accurate enough for legal and corporate documents?",
    a: "GrammaBG is trained specifically on Bulgarian language data including professional, legal, and academic writing. It handles complex grammatical cases that generic AI tools consistently miss.",
  },
  {
    q: "Is my document kept private?",
    a: "Absolutely. Your documents are never stored after processing and are never used for training. Everything is handled with full confidentiality — built for corporate use.",
  },
  {
    q: "What are the usage limits?",
    a: "Free users get 5 AI text corrections and 1 Word file fix per day. The Pro plan offers 200 text corrections, 50 Word file fixes, and 15 PDF exports per month — with the option to add extra credits anytime.",
  },
  {
    q: "Can I cancel my Pro plan anytime?",
    a: "Yes. Cancel with a single click — no questions asked, no hidden fees.",
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