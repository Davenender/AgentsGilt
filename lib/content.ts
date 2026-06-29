// =====================================================================
// Zentrale Inhalts-Datei für agents-gilt.agency
// Hier kannst du fast alle Texte der Website ändern, ohne Code anzufassen.
// =====================================================================

export const site = {
  name: "Agents Gilt",
  domain: "agents-gilt.agency",
  email: "kontakt@agents-gilt.agency",
  // Claim im Hero
  claimLine1: "KI-Lösungen,",
  claimLine2: "die dein Geschäft voranbringen.",
  heroSub:
    "Wir bauen moderne Websites, Chatbots, Voice-Agenten und Automatisierungen für lokale Unternehmen.",
  heroCtaPrimary: "Projekt anfragen",
  heroCtaSecondary: "Leistungen ansehen",
  // WhatsApp-Business-Nummer – international, NUR Ziffern (ohne + und ohne
  // Leerzeichen), z.B. "491701234567". Solange leer, öffnet WhatsApp ohne
  // feste Nummer (du wählst dann den Kontakt). Sobald du deine WhatsApp-
  // Business-Nummer hast, hier eintragen.
  whatsappNumber: "4916098427943",
  whatsappMessage:
    "Hey, ich hätte Interesse an einer Dienstleistung bzw. habe allgemeine Fragen dazu!",
};

export const intro = {
  kicker: "Was wir machen",
  headline: "Wir bauen in Stunden, wofür Agenturen Wochen brauchen.",
  text: "Mit modernster KI entwickeln wir maßgeschneiderte digitale Lösungen für kleine und mittlere Unternehmen – schnell, bezahlbar und auf neuestem Stand. Du bekommst Technik, die sonst großen Firmen vorbehalten ist.",
};

export type Service = {
  title: string;
  short: string;
  description: string;
  points: string[];
};

export const services: Service[] = [
  {
    title: "Websites & Landingpages",
    short: "Moderne Seiten, die Anfragen bringen.",
    description:
      "Schnelle, mobil-optimierte Websites mit klarem Design, die aus Besuchern echte Kunden machen.",
    points: ["Modernes, individuelles Design", "Für Google optimiert (SEO)", "Kontakt- & Buchungsformulare"],
  },
  {
    title: "KI-Chatbots",
    short: "Dein Assistent, der nie schläft.",
    description:
      "Ein intelligenter Chat-Assistent auf deiner Website, der rund um die Uhr Fragen beantwortet und Anfragen sammelt – auch nachts und am Wochenende.",
    points: ["Antwortet 24/7 automatisch", "Beantwortet aus deinen Infos", "Sammelt Leads & Kontakte"],
  },
  {
    title: "Voice-Agenten",
    short: "Kein verpasster Anruf mehr.",
    description:
      "Ein KI-Telefonassistent, der Anrufe annimmt, häufige Fragen beantwortet und Termine direkt einträgt – damit keine Anfrage verloren geht.",
    points: ["Nimmt Anrufe rund um die Uhr an", "Bucht & verschiebt Termine", "Leitet Notfälle an Menschen weiter"],
  },
  {
    title: "Online-Terminbuchung",
    short: "Schluss mit Telefon-Pingpong.",
    description:
      "Ein Buchungssystem, mit dem Kunden selbst Termine wählen – inklusive automatischer Erinnerungen gegen No-Shows.",
    points: ["Self-Service rund um die Uhr", "Automatische Erinnerungen", "Weniger Ausfälle (No-Shows)"],
  },
  {
    title: "Automatisierungen",
    short: "Lass die Routine sich selbst erledigen.",
    description:
      "Wir automatisieren wiederkehrende Abläufe – von Lead-Erfassung bis Rechnungsversand – und schenken dir Stunden zurück.",
    points: ["Spart Zeit & vermeidet Fehler", "Verbindet deine Tools", "Berichte & Benachrichtigungen"],
  },
  {
    title: "KI-Beratung & Audit",
    short: "Wo lohnt sich KI für dich?",
    description:
      "Wir analysieren deine Abläufe und zeigen dir eine klare, priorisierte Roadmap, wo KI dir am meisten Zeit und Umsatz bringt.",
    points: ["Analyse deiner Prozesse", "Priorisierte Roadmap", "Konkrete Umsetzungs-Schritte"],
  },
];

export const workflow = {
  kicker: "So arbeiten wir",
  headline: "In drei Schritten zu deiner Lösung.",
  steps: [
    {
      no: "01",
      title: "Gespräch & Analyse",
      text: "Wir hören zu und finden gemeinsam, wo dir KI am meisten Zeit und Umsatz bringt.",
    },
    {
      no: "02",
      title: "Bau mit KI",
      text: "Wir entwickeln deine Lösung in Tagen statt Wochen – und halten dich auf dem Laufenden.",
    },
    {
      no: "03",
      title: "Setup & Betreuung",
      text: "Wir richten alles startklar ein und betreuen dein System laufend weiter.",
    },
  ],
};

export const why = {
  kicker: "Warum Agents Gilt",
  headline: "Großer Anspruch. Persönlich umgesetzt.",
  items: [
    { title: "Schnell", text: "Erste Ergebnisse in Tagen, nicht Monaten." },
    { title: "Modern", text: "Technik auf dem neuesten Stand – wie bei den Großen." },
    { title: "Persönlich", text: "Ein direkter Ansprechpartner statt Hotline-Warteschleife." },
    { title: "Planbar", text: "Fairer Setup-Preis plus transparente monatliche Betreuung." },
  ],
};

export const contact = {
  kicker: "Kontakt",
  headline: "Lass uns über dein Projekt sprechen.",
  text: "Erzähl uns kurz, worum es geht – wir melden uns meist innerhalb eines Werktages.",
};
