// =====================================================================
// Inhalts-Datei für agentsgilt.com: Kontaktdaten (site), die sechs Leistungen, die Zertifikate und
// die Kundenstimmen. Die Texte der Startseite stehen in lib/inhalt-neu.ts. Die Texte der alten
// Startseite (Einleitung, Ablauf, Vorteile, Kontakt) sind seit dem 15.11.2026 entfernt.
// =====================================================================

export const site = {
  name: "Agents Gilt",
  domain: "agentsgilt.com",
  email: "kontakt@agentsgilt.com",
  // WhatsApp-Business-Nummer – international, NUR Ziffern (ohne + und ohne
  // Leerzeichen), z.B. "491701234567". Solange leer, öffnet WhatsApp ohne
  // feste Nummer (du wählst dann den Kontakt). Sobald du deine WhatsApp-
  // Business-Nummer hast, hier eintragen.
  whatsappNumber: "4916098427943",
  whatsappMessage:
    "Hey, ich hätte Interesse an einer Dienstleistung bzw. habe allgemeine Fragen dazu!",
  // Schalter für den Knopf „Per WhatsApp schreiben“ im Kontakt-Bereich der neuen
  // Seite. Standard: AUS. WhatsApp geben wir nur heraus, wenn ein Kunde danach
  // fragt. Auf true stellen, dann steht der Knopf wieder neben der Anruf-Karte.
  whatsappAnzeigen: false,
  // Geschäftsnummer, auf der unser eigener KI-Voice-Agent abnimmt.
  // "phone" ist das Format für tel:-Links (nur Ziffern und +),
  // "phoneDisplay" das, was Besucher lesen.
  phone: "+4961089694027",
  phoneDisplay: "+49 6108 9694027",
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

export const credentials = {
  kicker: "Ausbildung & Weiterbildung",
  headline: "Ausgebildet in Anthropics KI-Technologie.",
  text: "Wir bilden uns direkt bei Anthropic weiter – dem Unternehmen hinter Claude, einer der führenden KIs weltweit.",
  // Pro Kurs liegen zwei Zertifikate übereinander wie zwei Buchseiten – das
  // erste liegt vorne, das zweite blättert beim Überfahren nach vorne.
  // Reihenfolge hier = Reihenfolge im Stapel.
  items: [
    {
      title: "AI Fluency: Framework & Foundations",
      certs: [
        {
          name: "David Hesse",
          img: "/certificates/ai-fluency.png",
          pdf: "/certificates/ai-fluency.pdf",
        },
        {
          name: "Mijo Schulz",
          img: "/certificates/ai-fluency-mijo.png",
          pdf: "/certificates/ai-fluency-mijo.pdf",
        },
      ],
    },
    {
      title: "Claude 101",
      certs: [
        {
          name: "David Hesse",
          img: "/certificates/claude-101.png",
          pdf: "/certificates/claude-101.pdf",
        },
        {
          name: "Mijo Schulz",
          img: "/certificates/claude-101-mijo.png",
          pdf: "/certificates/claude-101-mijo.pdf",
        },
      ],
    },
    {
      title: "Claude Code in Action",
      certs: [
        {
          name: "David Hesse",
          img: "/certificates/claude-code.png",
          pdf: "/certificates/claude-code.pdf",
        },
        {
          name: "Mijo Schulz",
          img: "/certificates/claude-code-mijo.png",
          pdf: "/certificates/claude-code-mijo.pdf",
        },
      ],
    },
    {
      title: "Model Context Protocol: Advanced Topics",
      certs: [
        {
          name: "David Hesse",
          img: "/certificates/mcp-advanced.png",
          pdf: "/certificates/mcp-advanced.pdf",
        },
        {
          name: "Mijo Schulz",
          img: "/certificates/mcp-advanced-mijo.png",
          pdf: "/certificates/mcp-advanced-mijo.pdf",
        },
      ],
    },
  ],
};

// Kundenstimmen: Der Abschnitt ist fertig gebaut, aber AUS.
// Zum Einschalten: unten echte, freigegebene Stimmen eintragen und "aktiv" auf true setzen.
// Solange "aktiv" false ist, erscheint auf der Seite nichts davon.
export const testimonials = {
  aktiv: false,
  headline: "Was unsere Kunden sagen.",
  // PLATZHALTER – keine echten Stimmen. Vor dem Einschalten ersetzen.
  items: [
    { text: "Platzhalter: Hier steht eine echte Kundenstimme.", name: "Name", firma: "Betrieb, Ort" },
    { text: "Platzhalter: Hier steht eine echte Kundenstimme.", name: "Name", firma: "Betrieb, Ort" },
    { text: "Platzhalter: Hier steht eine echte Kundenstimme.", name: "Name", firma: "Betrieb, Ort" },
  ],
};

