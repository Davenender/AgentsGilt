// =====================================================================
// Texte der neuen Seite (Anrede „Sie“) für die Welt „Chromzeichen in der
// Punktwolke“. Solange die alte Startseite noch läuft, liegen sie getrennt
// von content.ts.
//
// WICHTIG: Die sechs Leistungstitel kommen wörtlich aus content.ts. Sie sind
// Schnittstellenwerte für Formular, Chat-Assistent und Notion
// (docs/funktionen.md, Abschnitt 4a) und dürfen nicht umbenannt werden.
// =====================================================================
import { credentials, services, site } from "@/lib/content";

export const marke = {
  name: site.name,
  telefon: site.phone,
  telefonAnzeige: site.phoneDisplay,
  email: site.email,
  whatsapp: `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(site.whatsappMessage)}`,
  orte: "Mühlheim am Main · Offenbach · Frankfurt · Hanau",
};

export const navigation = [
  { href: "#leistungen", label: "Leistungen" },
  { href: "#ablauf", label: "So läuft es ab" },
  { href: "#warum", label: "Warum wir" },
  { href: "#kontakt", label: "Kontakt" },
];

export const hero = {
  leise: "Es klingelt.",
  laut: "Ihr Assistent",
  gold: "nimmt ab.",
  unterzeile: "KI-Telefonassistent, Website und Chatbot für lokale Betriebe in Rhein-Main.",
  anrufStatus: "Assistent bereit",
  anrufen: "Jetzt anrufen",
  zweitknopf: "Leistungen ansehen",
  anrufHinweis: "Am Telefon nimmt unser KI-Assistent ab und macht direkt einen Termin aus.",
  // Kleiner Hinweis im Kopfbereich: Ein Klick schickt eine Welle durch den Namen.
  klickHinweis: "Klicken Sie irgendwo",
  tippHinweis: "Tippen Sie irgendwo",
};

// „Was wir machen“: Die Überschrift tippt sich selbst (Tagen → Stunden*).
export const wasWirMachen = {
  vor: "Wir bauen in ",
  falsch: "Tagen",
  richtig: "Stunden",
  nach: ", wofür Agenturen Wochen brauchen.",
  text: "Mit modernster KI entwickeln wir maßgeschneiderte digitale Lösungen für kleine und mittlere Unternehmen – schnell, bezahlbar und auf neuestem Stand. Sie bekommen Technik, die sonst großen Firmen vorbehalten ist.",
  fussnote: "* Gilt nur bei sehr einfachen Projekten und ist kein Versprechen.",
};

type LeistungsText = { kurz: string; text: string; punkte: string[] };

// Beschreibungen in der Sie-Form. Drei davon sind auf Davids Wunsch erweitert
// (Wissens-KI, CRM und interne Werkzeuge, individuelle KI-Systeme).
const leistungsTexte: Record<string, LeistungsText> = {
  "Websites & Landingpages": {
    kurz: "Moderne Seiten, die Anfragen bringen.",
    text: "Schnelle, mobil-optimierte Websites mit klarem Design, die aus Besuchern echte Kunden machen.",
    punkte: ["Modernes, individuelles Design", "Für Google optimiert (SEO)", "Kontakt- & Buchungsformulare"],
  },
  "KI-Chatbots": {
    kurz: "Ihr Assistent, der nie schläft.",
    text: "Ein intelligenter Chat-Assistent auf Ihrer Website, der rund um die Uhr Fragen beantwortet und Anfragen sammelt – auch nachts und am Wochenende. Auf Wunsch als Wissens-KI, die die eigenen Unterlagen Ihres Betriebs kennt.",
    punkte: ["Antwortet 24/7 automatisch", "Beantwortet aus Ihren Infos", "Sammelt Leads & Kontakte"],
  },
  "Voice-Agenten": {
    kurz: "Kein verpasster Anruf mehr.",
    text: "Ein KI-Telefonassistent, der Anrufe annimmt, häufige Fragen beantwortet und Termine direkt einträgt – damit keine Anfrage verloren geht.",
    punkte: ["Nimmt Anrufe rund um die Uhr an", "Bucht & verschiebt Termine", "Leitet Notfälle an Menschen weiter"],
  },
  "Online-Terminbuchung": {
    kurz: "Schluss mit Telefon-Pingpong.",
    text: "Ein Buchungssystem, mit dem Kunden selbst Termine wählen – inklusive automatischer Erinnerungen gegen No-Shows.",
    punkte: ["Self-Service rund um die Uhr", "Automatische Erinnerungen", "Weniger Ausfälle (No-Shows)"],
  },
  Automatisierungen: {
    kurz: "Die Routine erledigt sich selbst.",
    text: "Wir automatisieren wiederkehrende Abläufe – von Lead-Erfassung bis Rechnungsversand –, richten Ihr CRM ein und bauen interne Werkzeuge. Das schenkt Ihnen Stunden zurück.",
    punkte: ["Spart Zeit & vermeidet Fehler", "Verbindet Ihre Tools", "Berichte & Benachrichtigungen"],
  },
  "KI-Beratung & Audit": {
    kurz: "Wo lohnt sich KI für Sie?",
    text: "Wir analysieren Ihre Abläufe und zeigen Ihnen eine klare, priorisierte Roadmap, wo KI Ihnen am meisten Zeit und Umsatz bringt. Dazu gehören auch individuelle KI-Systeme, zum Beispiel ein Kundenportal.",
    punkte: ["Analyse Ihrer Prozesse", "Priorisierte Roadmap", "Konkrete Umsetzungs-Schritte"],
  },
};

export type Leistung = LeistungsText & { nr: string; titel: string };

export const leistungen: Leistung[] = services.map((s, i) => ({
  nr: String(i + 1).padStart(2, "0"),
  titel: s.title,
  ...(leistungsTexte[s.title] ?? { kurz: s.short, text: s.description, punkte: s.points }),
}));

export const leistungenKopf = {
  vor: "Alles, was Ihr Geschäft",
  gold: "digital",
  nach: "braucht.",
  text: "Von der Website bis zum Telefon-Agenten – wir bauen die Lösung, die zu Ihrem Problem passt. Einzeln oder als Komplettpaket.",
  waehlen: "Anfragen",
};

export const ablauf = {
  vor: "In drei Schritten zu",
  gold: "Ihrer Lösung.",
  schritte: [
    { nr: "01", titel: "Gespräch & Analyse", text: "Wir hören zu und finden gemeinsam, wo Ihnen KI am meisten Zeit und Umsatz bringt." },
    { nr: "02", titel: "Bau mit KI", text: "Wir entwickeln Ihre Lösung in Tagen statt Wochen – und halten Sie auf dem Laufenden." },
    { nr: "03", titel: "Setup & Betreuung", text: "Wir richten alles startklar ein und betreuen Ihr System laufend weiter." },
  ],
  schritt: "Schritt",
  ziel: "startklar",
};

export const warum = {
  vor: "Großer Anspruch.",
  gold: "Persönlich",
  nach: "umgesetzt.",
  punkte: [
    { titel: "Schnell", text: "Erste Ergebnisse in Tagen, nicht Monaten." },
    { titel: "Modern", text: "Technik auf dem neuesten Stand – wie bei den Großen." },
    { titel: "Persönlich", text: "Ein direkter Ansprechpartner statt Hotline-Warteschleife." },
    { titel: "Planbar", text: "Fairer Setup-Preis plus transparente monatliche Betreuung." },
  ],
};

export const ausbildung = {
  vor: "Ausgebildet in",
  gold: "Anthropics",
  nach: "KI-Technologie.",
  text: "Wir bilden uns direkt bei Anthropic weiter – dem Unternehmen hinter Claude, einer der führenden KIs weltweit.",
  kurse: credentials.items,
  ansehen: "Zertifikat ansehen",
};

export const kontakt = {
  vor: "Sprechen wir über",
  gold: "Ihr Projekt.",
  text: "Rufen Sie an: Unser Assistent nimmt ab und macht direkt einen Termin aus. Wer lieber schreibt, bekommt meist innerhalb eines Werktages Antwort.",
  whatsapp: "Per WhatsApp schreiben",
  formular: {
    frage: "Lieber schreiben?",
    oeffnen: "Anfrage-Formular öffnen",
    schliessen: "Anfrage-Formular schließen",
    name: "Name",
    namePlatz: "Ihr Name",
    email: "E-Mail",
    emailPlatz: "name@firma.de",
    firma: "Unternehmen",
    firmaPlatz: "Optional",
    leistung: "Gewünschte Leistung",
    allgemein: "Allgemeine Anfrage",
    sonstiges: "Sonstiges (selbst beschreiben)",
    nachricht: "Worum geht es?",
    nachrichtPlatz: "Erzählen Sie uns kurz von Ihrem Projekt oder Problem …",
    nachrichtSonstiges: "Beschreiben Sie Ihre Leistung",
    nachrichtSonstigesPlatz: "Beschreiben Sie kurz, welche Leistung Sie sich vorstellen …",
    ausChat: "Wir haben Angaben aus dem Chat übernommen. Bitte prüfen Sie diese noch einmal auf Fehler.",
    senden: "Anfrage absenden",
    sendet: "Wird gesendet …",
    dankeTitel: "Danke! Ihre Anfrage ist da.",
    dankeText: "Wir melden uns meist innerhalb eines Werktages bei Ihnen.",
  },
};

export const fuss = {
  text: "KI-Lösungen für lokale Unternehmen – moderne Websites, Chatbots, Voice-Agenten und Automatisierungen.",
  rechte: "Alle Rechte vorbehalten.",
};
