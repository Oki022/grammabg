import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ScrollText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

type Section = { h: string; p: string[] };

const content: Record<"bg" | "en", {
  title: string;
  titleAccent: string;
  updated: string;
  intro: string;
  sections: Section[];
}> = {
  bg: {
    title: "Условия за",
    titleAccent: "ползване",
    updated: "Последна актуализация: 17 октомври 2026 г.",
    intro:
      "Настоящите условия уреждат използването на услугата GrammaBG, достъпна на адрес grammabg.com. Чрез създаване на акаунт или използване на услугата вие се съгласявате с тях. Ако не приемате тези условия, моля не използвайте услугата.",
    sections: [
      {
        h: "1. Описание на услугата",
        p: [
          "GrammaBG е онлайн инструмент за езикова корекция на български текстове и документи. Услугата коригира правопис, граматика, пунктуация и стил, като запазва оригиналното форматиране на Word (.docx) и PDF документите.",
          "Корекцията се извършва автоматично чрез езикови модели. Резултатът е помощно средство и не замества професионална редакторска или юридическа проверка, когато такава е необходима.",
        ],
      },
      {
        h: "2. Акаунт",
        p: [
          "Част от функциите са достъпни без регистрация, в рамките на дневен безплатен лимит. За пълен достъп е необходим акаунт.",
          "Вие отговаряте за опазването на данните за вход към своя акаунт и за всички действия, извършени чрез него.",
          "Услугата не е предназначена за лица под 16 години.",
          "Забранено е създаването на множество акаунти или използването на технически средства с цел заобикаляне на лимитите на безплатния план.",
        ],
      },
      {
        h: "3. Планове и лимити",
        p: [
          "Безплатен план: 5 текстови корекции и 1 поправка на Word файл на ден. Лимитът се нулира на всеки 24 часа.",
          "Pro план: 200 текстови корекции, 50 поправки на Word файлове и 15 PDF експорта на месец, както и достъп до историята на корекциите.",
          "Годишен Pro план: същите месечни лимити при годишно плащане на намалена цена.",
          "Неизползваните корекции не се прехвърлят към следващия период. При изчерпване на лимита можете да изчакате следващия период или да закупите допълнителни кредити, когато такива се предлагат.",
          "Запазваме си правото да коригираме лимитите на плановете, като уведомяваме потребителите предварително.",
        ],
      },
      {
        h: "4. Цени, плащане и подновяване",
        p: [
          "Актуалните цени са публикувани на страницата с цени на сайта. Всички цени са в евро.",
          "Плащанията се обработват от Stripe. Ние не получаваме и не съхраняваме данните на вашата карта.",
          "Абонаментите се подновяват автоматично в края на всеки период — месечен или годишен — докато не бъдат отменени.",
          "Промени в цените не засягат текущия ви платен период. При промяна уведомяваме абонатите най-малко 30 дни предварително.",
        ],
      },
      {
        h: "5. Отмяна и възстановяване на суми",
        p: [
          "Можете да отмените абонамента си по всяко време от страницата на профила си. След отмяна Pro функциите остават активни до края на вече платения период, след което акаунтът преминава към безплатния план.",
          "Съгласно чл. 16 от Директива 2011/83/ЕС правото на отказ отпада, когато цифровата услуга е започнала да се предоставя с изричното съгласие на потребителя. При първото използване на Pro функция вие давате такова съгласие.",
          "При технически проблем, който ни е възпрепятствал да предоставим услугата, можем да възстановим платената сума изцяло или частично по наша преценка. Свържете се с нас през формата за контакт.",
        ],
      },
      {
        h: "6. Вашето съдържание",
        p: [
          "Вие запазвате всички права върху текста и документите, които подавате за корекция. Ние не придобиваме собственост върху тях.",
          "Вие ни предоставяте ограничено право да обработим съдържанието единствено с цел да изпълним заявената корекция и да ви върнем резултата.",
          "Вие отговаряте за това да имате право да обработвате подаденото съдържание, включително когато то съдържа лични данни на трети лица или поверителна фирмена информация.",
          "Не използваме вашето съдържание за обучение на модели. Подробности за обработката са описани в Политиката за поверителност.",
        ],
      },
      {
        h: "7. Допустимо използване",
        p: [
          "Забранено е използването на услугата за обработка на незаконно съдържание, както и за създаване на материали, които нарушават правата на трети лица.",
          "Забранен е автоматизираният достъп до услугата чрез скриптове, ботове или други технически средства без наше писмено съгласие.",
          "Забранени са действия, които натоварват прекомерно инфраструктурата ни или нарушават нормалната работа на услугата за други потребители.",
          "При нарушение на тези условия можем да ограничим или прекратим достъпа до акаунта без възстановяване на платени суми.",
        ],
      },
      {
        h: "8. Наличност на услугата",
        p: [
          "Стремим се услугата да бъде достъпна без прекъсване, но не гарантираме непрекъсваемост. Възможни са периоди на планирана поддръжка или технически проблеми извън нашия контрол.",
          "Услугата зависи от трети доставчици (хостинг, бази данни, доставчици на езикови модели). Прекъсване при тях може да засегне наличността.",
        ],
      },
      {
        h: "9. Ограничение на отговорността",
        p: [
          "Услугата се предоставя „както е“. Не гарантираме, че всяка езикова корекция е безгрешна или подходяща за конкретна цел.",
          "Препоръчваме да проверявате резултата преди използването му в официални, правни или договорни документи.",
          "В максималната степен, допустима от приложимото право, нашата отговорност за вреди е ограничена до сумата, която сте платили за услугата през последните дванадесет месеца.",
          "Тези ограничения не засягат правата ви като потребител съгласно императивните норми на българското и европейското законодателство.",
        ],
      },
      {
        h: "10. Прекратяване",
        p: [
          "Можете да прекратите използването на услугата и да поискате изтриване на акаунта си по всяко време през формата за контакт.",
          "Можем да прекратим или спрем достъпа ви при съществено нарушение на тези условия, като ви уведомим, освен ако незабавното спиране не е необходимо.",
        ],
      },
      {
        h: "11. Промени в условията",
        p: [
          "Може да актуализираме тези условия. При съществени промени уведомяваме регистрираните потребители по имейл най-малко 14 дни предварително. Продължаването на използването на услугата след влизането им в сила означава приемане на новите условия.",
        ],
      },
      {
        h: "12. Приложимо право",
        p: [
          "Тези условия се уреждат от законодателството на Република България. Споровете се решават от компетентния български съд, освен ако императивна норма не предвижда друго.",
          "Като потребител имате право да се обърнете и към платформата на Европейската комисия за онлайн решаване на спорове.",
        ],
      },
      {
        h: "13. Контакт",
        p: [
          "За въпроси относно тези условия използвайте формата за контакт на grammabg.com/contact.",
        ],
      },
    ],
  },
  en: {
    title: "Terms of",
    titleAccent: "Service",
    updated: "Last updated: 17 October 2026",
    intro:
      "These terms govern your use of the GrammaBG service available at grammabg.com. By creating an account or using the service you agree to them. If you do not accept these terms, please do not use the service.",
    sections: [
      {
        h: "1. Description of the service",
        p: [
          "GrammaBG is an online tool for correcting Bulgarian text and documents. The service corrects spelling, grammar, punctuation and style while preserving the original formatting of Word (.docx) and PDF documents.",
          "Corrections are produced automatically by language models. The result is an aid and does not replace professional editorial or legal review where such review is required.",
        ],
      },
      {
        h: "2. Account",
        p: [
          "Some features are available without registration, within a daily free limit. Full access requires an account.",
          "You are responsible for keeping your login details safe and for all activity carried out through your account.",
          "The service is not intended for persons under 16.",
          "Creating multiple accounts or using technical means to circumvent the free plan limits is prohibited.",
        ],
      },
      {
        h: "3. Plans and limits",
        p: [
          "Free plan: 5 text corrections and 1 Word file fix per day. The limit resets every 24 hours.",
          "Pro plan: 200 text corrections, 50 Word file fixes and 15 PDF exports per month, plus access to correction history.",
          "Yearly Pro plan: the same monthly limits, paid annually at a reduced price.",
          "Unused corrections do not carry over to the next period. When a limit is reached you may wait for the next period or purchase additional credits where offered.",
          "We reserve the right to adjust plan limits, giving users advance notice.",
        ],
      },
      {
        h: "4. Pricing, payment and renewal",
        p: [
          "Current prices are published on the pricing section of the site. All prices are in euros.",
          "Payments are processed by Stripe. We never receive or store your card details.",
          "Subscriptions renew automatically at the end of each period — monthly or yearly — until cancelled.",
          "Price changes do not affect your current paid period. We notify subscribers at least 30 days before any change.",
        ],
      },
      {
        h: "5. Cancellation and refunds",
        p: [
          "You may cancel your subscription at any time from your profile page. After cancellation, Pro features remain active until the end of the period already paid for, after which the account moves to the free plan.",
          "Under Article 16 of Directive 2011/83/EU, the right of withdrawal lapses once the supply of a digital service has begun with the consumer's express consent. You give such consent when you first use a Pro feature.",
          "If a technical fault on our side prevented us from delivering the service, we may refund the amount paid in full or in part at our discretion. Contact us through the contact form.",
        ],
      },
      {
        h: "6. Your content",
        p: [
          "You retain all rights to the text and documents you submit for correction. We acquire no ownership of them.",
          "You grant us a limited right to process that content solely in order to perform the requested correction and return the result to you.",
          "You are responsible for having the right to process the content you submit, including where it contains personal data of third parties or confidential company information.",
          "We do not use your content to train models. Details of processing are set out in the Privacy Policy.",
        ],
      },
      {
        h: "7. Acceptable use",
        p: [
          "You may not use the service to process unlawful content or to create material that infringes the rights of others.",
          "Automated access through scripts, bots or other technical means is prohibited without our written consent.",
          "Activity that places an excessive load on our infrastructure or disrupts the normal operation of the service for others is prohibited.",
          "If these terms are breached, we may restrict or terminate access to the account without refunding amounts paid.",
        ],
      },
      {
        h: "8. Service availability",
        p: [
          "We aim to keep the service available without interruption, but we do not guarantee uninterrupted operation. Scheduled maintenance or technical issues outside our control may occur.",
          "The service depends on third-party providers (hosting, databases, language model providers). An outage on their side may affect availability.",
        ],
      },
      {
        h: "9. Limitation of liability",
        p: [
          "The service is provided \"as is\". We do not warrant that every correction is free of errors or fit for a particular purpose.",
          "We recommend reviewing the result before using it in official, legal or contractual documents.",
          "To the maximum extent permitted by applicable law, our liability for damages is limited to the amount you paid for the service during the preceding twelve months.",
          "These limitations do not affect your rights as a consumer under mandatory provisions of Bulgarian and European law.",
        ],
      },
      {
        h: "10. Termination",
        p: [
          "You may stop using the service and request deletion of your account at any time through the contact form.",
          "We may terminate or suspend your access for a material breach of these terms, giving you notice unless immediate suspension is necessary.",
        ],
      },
      {
        h: "11. Changes to these terms",
        p: [
          "We may update these terms. For material changes we notify registered users by email at least 14 days in advance. Continuing to use the service after they take effect constitutes acceptance of the new terms.",
        ],
      },
      {
        h: "12. Governing law",
        p: [
          "These terms are governed by the law of the Republic of Bulgaria. Disputes are resolved by the competent Bulgarian court, unless a mandatory provision requires otherwise.",
          "As a consumer you may also refer a dispute to the European Commission's online dispute resolution platform.",
        ],
      },
      {
        h: "13. Contact",
        p: [
          "For questions about these terms, use the contact form at grammabg.com/contact.",
        ],
      },
    ],
  },
};

const Terms = () => {
  const { language, t } = useLanguage();
  const c = content[language] ?? content.bg;

  useEffect(() => {
    document.title =
      language === "bg"
        ? "Условия за ползване | GRAMMABG.COM"
        : "Terms of Service | GRAMMABG.COM";
  }, [language]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="container py-16 md:py-24">
          <div className="mb-6 flex justify-end">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" /> {t.common.back}
              </Button>
            </Link>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-emerald shadow-emerald mb-5">
                <ScrollText className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-3">
                {c.title} <span className="text-gradient-emerald">{c.titleAccent}</span>
              </h1>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {c.updated}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-gradient-card p-6 md:p-10 shadow-card-premium backdrop-blur">
              <p className="text-sm md:text-base leading-relaxed text-foreground/90 mb-8">
                {c.intro}
              </p>

              <div className="space-y-8">
                {c.sections.map((s) => (
                  <section key={s.h}>
                    <h2 className="font-display text-lg md:text-xl font-semibold mb-3">
                      {s.h}
                    </h2>
                    <div className="space-y-3">
                      {s.p.map((paragraph, i) => (
                        <p
                          key={i}
                          className="text-sm leading-relaxed text-muted-foreground"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              <Link to="/privacy" className="text-primary hover:underline">
                {language === "bg" ? "Политика за поверителност" : "Privacy Policy"}
              </Link>
              {"  ·  "}
              <Link to="/contact" className="text-primary hover:underline">
                {t.nav.contact}
              </Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
