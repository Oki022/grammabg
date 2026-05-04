import { CheckCircle2, Languages, FileText } from "lucide-react";

const features = [
  {
    icon: CheckCircle2,
    title: "Smart Grammar & Style Fixes",
    desc: "Go beyond simple typos. Our advanced AI enhances your Bulgarian text for perfect clarity, professional flow, and native-sounding elegance.",
  },
  {
    icon: Languages,
    title: "Any Language to Bulgarian",
    desc: "Translate and polish text from ANY language into flawless Bulgarian. Ensure your message remains natural and culturally accurate every time.",
  },
  {
    icon: FileText,
    title: "Professional Document Support",
    desc: "Fix Word (.docx) files while preserving their original layout. Pro users unlock high-quality PDF exports and cloud-saved History for ultimate productivity.",
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
