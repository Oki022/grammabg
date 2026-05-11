import { CheckCircle2, Languages, FileText } from "lucide-react";

const features = [
  {
    icon: CheckCircle2,
    title: "Professional Grammar Standard",
    desc: "Beyond simple typo fixes. GrammaBG corrects grammar, punctuation, and style to meet the standard expected in corporate and legal communication.",
  },
  {
    icon: Languages,
    title: "Fix the Language. Keep the Structure.",
    desc: "Unlike standard tools, GrammaBG never touches your formatting. Tables, logos, signatures, and page layout stay exactly as they were.",
  },
  {
    icon: FileText,
    title: "Word & PDF Document Support",
    desc: "Upload .docx or PDF files and receive a corrected document in the same format — ready to send, sign, or publish without any reformatting.",
  },
];

const Features = () => (
  <section className="container pb-16 md:pb-24">
    <div className="mx-auto max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
      {features.map((f) => (
        <div
          key={f.title}
          className="group flex flex-col items-center text-center rounded-2xl border border-border bg-card/40 p-6 backdrop-blur transition-smooth hover:border-primary/40 hover:bg-card/70"
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-emerald shadow-emerald mb-4 transition-smooth group-hover:scale-105">
            <f.icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <h3 className="font-display text-base md:text-lg font-semibold mb-1">
            {f.title}
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground">{f.desc}</p>
        </div>
      ))}
    </div>
  </section>
);

export default Features;