import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
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
    title: "Политика за",
    titleAccent: "поверителност",
    updated: "Последна актуализация: 17 октомври 2026 г.",
    intro:
      "GrammaBG („ние“, „нас“) предоставя онлайн услуга за езикова корекция на български текстове и документи на адрес grammabg.com. Тази политика обяснява какви лични данни събираме, защо ги събираме, с кого ги споделяме и какви права имате върху тях.",
    sections: [
      {
        h: "1. Какви данни събираме",
        p: [
          "Данни за акаунт: имейл адрес, име за показване и криптирана парола. Ако влезете чрез Google, получаваме от Google вашия имейл адрес, име и профилна снимка — нямаме достъп до паролата на Google акаунта ви.",
          "Данни за абонамент: при закупуване на Pro план нашият платежен доставчик Stripe обработва данните на картата ви. Ние не получаваме и не съхраняваме номера на карти. Запазваме само идентификатор на клиент, идентификатор на абонамент, статус и дата на подновяване.",
          "Данни за употреба: брой извършени текстови корекции, обработени Word файлове и PDF експорти, за да прилагаме лимитите на съответния план.",
          "Текст и документи: текстът, който поставяте, и файловете, които качвате, за да бъдат коригирани.",
          "Технически данни: IP адрес, тип браузър, език и операционна система, събирани автоматично при посещение на сайта.",
          "Идентификатор на устройство: за потребители без акаунт генерираме анонимен технически идентификатор от характеристиките на браузъра (тип браузър, езикови настройки, резолюция, часова зона). Той служи единствено за прилагане на дневния безплатен лимит и не позволява да бъдете идентифицирани като личност.",
          "Съобщения: когато ни пишете през формата за контакт, запазваме вашето име, имейл адрес и съдържанието на съобщението.",
        ],
      },
      {
        h: "2. Как използваме данните",
        p: [
          "За да предоставяме услугата: обработка на текста ви и връщане на коригирана версия със запазено форматиране.",
          "За управление на акаунта и абонамента ви, включително обработка на плащания и подновявания.",
          "За прилагане на лимитите на безплатния и платения план и за предотвратяване на злоупотреби.",
          "За да отговаряме на запитвания, изпратени през формата за контакт.",
          "За анонимна статистика за посещаемост, която ни помага да подобряваме сайта.",
          "Ние не използваме вашия текст или документи за обучение на модели за изкуствен интелект.",
        ],
      },
      {
        h: "3. Обработка на текста и документите ви",
        p: [
          "Когато поискате корекция, съдържанието на текста или документа се изпраща криптирано към нашия сървър и оттам към доставчик на езикови модели, който извършва самата корекция.",
          "Обработката се извършва в реално време. След връщане на резултата текстът не се съхранява на нашите сървъри.",
          "Единственото изключение е историята на корекциите за Pro потребители: ако използвате Pro план, оригиналният и коригираният текст се запазват във вашия профил, за да имате достъп до тях по-късно. Можете да поискате изтриването им по всяко време.",
          "Word и PDF файловете се обработват временно в паметта и не се архивират.",
        ],
      },
      {
        h: "4. С кого споделяме данни",
        p: [
          "Supabase — хостинг на базата данни и услуга за автентикация. Съхранява акаунта, абонаментния статус и данните за употреба.",
          "Stripe — обработка на плащания и управление на абонаменти. Stripe обработва данните на картата ви съгласно своята политика за поверителност.",
          "Vercel — хостинг на уебсайта и обслужване на съдържанието.",
          "Доставчик на езикови модели — получава текста ви единствено за целите на корекцията, в рамките на конкретната заявка.",
          "Google Analytics — анонимна статистика за посещаемост.",
          "Google (при вход с Google акаунт) — само когато изберете този начин на вход.",
          "Ние не продаваме и не отдаваме под наем вашите лични данни на трети страни. Не споделяме данни за рекламни цели.",
        ],
      },
      {
        h: "5. Срок на съхранение",
        p: [
          "Данните на акаунта се съхраняват, докато акаунтът ви е активен.",
          "Данните за употреба се нулират ежедневно за безплатния план и ежемесечно за Pro плана.",
          "Историята на корекциите на Pro потребители се съхранява до изтриване на акаунта или до изрично искане за заличаване.",
          "Съобщенията от формата за контакт се съхраняват до 12 месеца.",
          "Данните за фактуриране се съхраняват от Stripe съгласно приложимото счетоводно законодателство.",
        ],
      },
      {
        h: "6. Сигурност",
        p: [
          "Използваме криптирана връзка (HTTPS/TLS) при всяко предаване на данни.",
          "Паролите се съхраняват в хеширан вид и са недостъпни както за нас, така и за трети страни.",
          "Достъпът до базата данни е ограничен чрез правила на ниво ред, така че всеки потребител вижда единствено собствените си данни.",
          "Въпреки взетите мерки, нито един метод на предаване през интернет не е напълно сигурен и не можем да гарантираме абсолютна защита.",
        ],
      },
      {
        h: "7. Вашите права",
        p: [
          "Съгласно Общия регламент относно защитата на данните (GDPR) имате право на достъп до своите данни, на коригиране на неточни данни, на изтриване, на ограничаване на обработката, на преносимост и на възражение срещу обработката.",
          "Имате право да оттеглите съгласието си по всяко време, както и да подадете жалба до Комисията за защита на личните данни в Република България.",
          "За да упражните тези права, пишете ни през формата за контакт на сайта. Отговаряме в срок до 30 дни.",
        ],
      },
      {
        h: "8. Бисквитки",
        p: [
          "Използваме строго необходими бисквитки, за да поддържаме сесията ви след вход и да запомним избрания от вас език и тема.",
          "Използваме и аналитични бисквитки (Google Analytics) за анонимна статистика. Можете да откажете тяхното използване чрез банера за бисквитки при първото си посещение.",
          "Не използваме рекламни бисквитки на трети страни.",
        ],
      },
      {
        h: "9. Деца",
        p: [
          "Услугата не е предназначена за лица под 16 години. Не събираме съзнателно лични данни от деца. Ако установим, че сме получили такива данни, ще ги изтрием.",
        ],
      },
      {
        h: "10. Промени в политиката",
        p: [
          "Може да актуализираме тази политика. При съществени промени ще уведомим регистрираните потребители по имейл най-малко 14 дни предварително. Датата на последна актуализация е посочена в началото на страницата.",
        ],
      },
      {
        h: "11. Контакт",
        p: [
          "За въпроси относно тази политика или относно обработката на вашите лични данни, използвайте формата за контакт на grammabg.com/contact.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy",
    titleAccent: "Policy",
    updated: "Last updated: 17 October 2026",
    intro:
      "GrammaBG (\"we\", \"us\") provides an online language correction service for Bulgarian text and documents at grammabg.com. This policy explains what personal data we collect, why we collect it, who we share it with, and what rights you have over it.",
    sections: [
      {
        h: "1. Data we collect",
        p: [
          "Account data: email address, display name and an encrypted password. If you sign in with Google, we receive your email address, name and profile picture from Google — we never have access to your Google password.",
          "Subscription data: when you purchase a Pro plan, our payment provider Stripe processes your card details. We never receive or store card numbers. We keep only a customer identifier, a subscription identifier, its status and the renewal date.",
          "Usage data: the number of text corrections, Word files processed and PDF exports, so that we can apply the limits of your plan.",
          "Text and documents: the text you paste and the files you upload for correction.",
          "Technical data: IP address, browser type, language and operating system, collected automatically when you visit the site.",
          "Device identifier: for users without an account we generate an anonymous technical identifier from browser characteristics (browser type, language settings, screen resolution, time zone). It is used solely to enforce the daily free limit and does not allow you to be identified as an individual.",
          "Messages: when you write to us through the contact form, we store your name, email address and the content of your message.",
        ],
      },
      {
        h: "2. How we use the data",
        p: [
          "To provide the service: processing your text and returning a corrected version with the formatting preserved.",
          "To manage your account and subscription, including processing payments and renewals.",
          "To enforce the limits of the free and paid plans and to prevent abuse.",
          "To respond to enquiries sent through the contact form.",
          "For anonymous traffic statistics that help us improve the site.",
          "We do not use your text or documents to train artificial intelligence models.",
        ],
      },
      {
        h: "3. Processing of your text and documents",
        p: [
          "When you request a correction, the content of your text or document is sent over an encrypted connection to our server and from there to a language model provider that performs the correction itself.",
          "Processing happens in real time. Once the result is returned, the text is not retained on our servers.",
          "The only exception is correction history for Pro users: if you are on a Pro plan, the original and corrected text are saved to your profile so you can access them later. You may request their deletion at any time.",
          "Word and PDF files are processed temporarily in memory and are not archived.",
        ],
      },
      {
        h: "4. Who we share data with",
        p: [
          "Supabase — database hosting and authentication. Stores your account, subscription status and usage data.",
          "Stripe — payment processing and subscription management. Stripe handles your card details under its own privacy policy.",
          "Vercel — website hosting and content delivery.",
          "Language model provider — receives your text solely for the purpose of the correction, within the scope of that single request.",
          "Google Analytics — anonymous traffic statistics.",
          "Google (for Google sign-in) — only when you choose that sign-in method.",
          "We do not sell or rent your personal data to third parties. We do not share data for advertising purposes.",
        ],
      },
      {
        h: "5. Retention period",
        p: [
          "Account data is kept for as long as your account is active.",
          "Usage data resets daily on the free plan and monthly on the Pro plan.",
          "Correction history for Pro users is kept until your account is deleted or until you explicitly request erasure.",
          "Contact form messages are kept for up to 12 months.",
          "Billing records are retained by Stripe in accordance with applicable accounting law.",
        ],
      },
      {
        h: "6. Security",
        p: [
          "We use an encrypted connection (HTTPS/TLS) for every data transfer.",
          "Passwords are stored in hashed form and are not accessible to us or to third parties.",
          "Database access is restricted by row-level security rules, so each user can only see their own data.",
          "Despite these measures, no method of transmission over the internet is completely secure and we cannot guarantee absolute protection.",
        ],
      },
      {
        h: "7. Your rights",
        p: [
          "Under the General Data Protection Regulation (GDPR) you have the right to access your data, to rectify inaccurate data, to erasure, to restriction of processing, to data portability and to object to processing.",
          "You have the right to withdraw your consent at any time and to lodge a complaint with the Commission for Personal Data Protection in the Republic of Bulgaria.",
          "To exercise these rights, write to us through the contact form on the site. We respond within 30 days.",
        ],
      },
      {
        h: "8. Cookies",
        p: [
          "We use strictly necessary cookies to keep you signed in and to remember your chosen language and theme.",
          "We also use analytics cookies (Google Analytics) for anonymous statistics. You can decline them through the cookie banner on your first visit.",
          "We do not use third-party advertising cookies.",
        ],
      },
      {
        h: "9. Children",
        p: [
          "The service is not intended for persons under 16. We do not knowingly collect personal data from children. If we discover that we have received such data, we will delete it.",
        ],
      },
      {
        h: "10. Changes to this policy",
        p: [
          "We may update this policy. For material changes we will notify registered users by email at least 14 days in advance. The date of the last update is shown at the top of this page.",
        ],
      },
      {
        h: "11. Contact",
        p: [
          "For questions about this policy or about the processing of your personal data, use the contact form at grammabg.com/contact.",
        ],
      },
    ],
  },
};

const Privacy = () => {
  const { language, t } = useLanguage();
  const c = content[language] ?? content.bg;

  useEffect(() => {
    document.title =
      language === "bg"
        ? "Политика за поверителност | GRAMMABG.COM"
        : "Privacy Policy | GRAMMABG.COM";
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
                <ShieldCheck className="h-6 w-6 text-primary-foreground" />
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
              <Link to="/terms" className="text-primary hover:underline">
                {language === "bg" ? "Условия за ползване" : "Terms of Service"}
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

export default Privacy;
