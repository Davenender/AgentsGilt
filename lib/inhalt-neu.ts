// =====================================================================
// Texte der neuen Seite (Anrede „Sie“) für die Welt „Chromzeichen in der
// Punktwolke“. Solange die alte Startseite noch läuft, liegen sie getrennt
// von content.ts.
//
// WICHTIG: Die sechs Leistungstitel kommen wörtlich aus content.ts. Sie sind
// Schnittstellenwerte für Formular, Chat-Assistent und Notion
// (docs/funktionen.md, Abschnitt 4a) und dürfen nicht umbenannt werden.
// =====================================================================
import { credentials, services, site, testimonials } from "@/lib/content";

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

// Die erste Aussage unter dem Kopfbereich: die Hauptüberschrift der Seite. Sie tippt sich selbst,
// zuerst mit dem falschen Wort („Tagen“); das zerfällt und rastet als das richtige ein
// („Stunden“), das golden aufleuchtet. Darunter zeigt ein Wettlauf aus zwei Balken dasselbe als
// Bild (ohne Zahlen), dann folgen drei Glaskarten mit Davids Text in der Sie-Form.
export const aussage = {
  vor: wasWirMachen.vor.trim(),
  erst: wasWirMachen.falsch,
  gold: wasWirMachen.richtig,
  nach: wasWirMachen.nach,
  fussnote: wasWirMachen.fussnote,
  lauf: {
    // Für Vorleseprogramme: Der Wettlauf ist ein Bild.
    beschreibung: "Vergleich: Eine Agentur braucht Wochen, Agents Gilt Stunden (siehe Fußnote).",
    agentur: { name: "Agentur", zeit: "Wochen" },
    wir: { name: marke.name, zeit: wasWirMachen.richtig },
  },
  karten: [
    {
      symbol: "mass",
      titel: "Maßgeschneidert mit KI",
      text: "Wir entwickeln digitale Lösungen, die genau zu Ihrem Betrieb passen: mit modernster KI statt Baukasten von der Stange.",
    },
    {
      symbol: "tempo",
      titel: "Schnell und bezahlbar",
      text: "Erste Ergebnisse in Tagen statt Monaten, zu festen und fairen Preisen für kleine und mittlere Unternehmen.",
    },
    {
      symbol: "technik",
      titel: "Technik wie bei den Großen",
      text: "Sie bekommen Technik auf dem neuesten Stand, die sonst großen Firmen vorbehalten ist.",
    },
  ],
} as const;

// Die Wörter im Wörter-Feld um den Stern und im laufenden Band.
export const worte = ["Persönlich", "Schnell", "Feste Preise", "Aus Rhein-Main", "Modern", "Rund um die Uhr"];

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

// Kleine Szenen über den Leistungskarten. Alle Zahlen darin sind Beispiele und so beschriftet.
export type SzenenArt = "web" | "chat" | "voice" | "termin" | "auto" | "rat";
export const szeneZu: Record<string, SzenenArt> = {
  "Websites & Landingpages": "web",
  "KI-Chatbots": "chat",
  "Voice-Agenten": "voice",
  "Online-Terminbuchung": "termin",
  Automatisierungen: "auto",
  "KI-Beratung & Audit": "rat",
};
export const szenen = {
  beispiel: "Beispiel",
  voice: { klingelt: "Es klingelt – Ihr Assistent nimmt ab", fertig: "Termin eingetragen" },
  chat: { frage: "Haben Sie morgen noch einen Termin frei?", antwort: "Ja, um 10:30 Uhr. Soll ich ihn eintragen?" },
  termin: { monat: "Mai", tage: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], fertig: "Gebucht" },
  auto: { karten: ["Anfrage", "Angebot", "Rechnung"], zahl: 12, einheit: "Stunden gespart" },
  web: { adresse: "ihr-betrieb.de", wort: "Anfragen", zahl: 38 },
  rat: { punkte: leistungsTexte["KI-Beratung & Audit"].punkte },
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

// „Unser Versprechen“ im Abschnitt „Warum wir“: drei Karten (aus den bisherigen Vorteilen).
export const versprechen = {
  text: "Technik wie bei den Großen – persönlich betreut.",
  titel: "Unser Versprechen",
  karten: [
    { titel: "Persönlich", text: "Ein direkter Ansprechpartner statt Hotline-Warteschleife." },
    { titel: "Schnell", text: "Erste Ergebnisse in Tagen, nicht Monaten." },
    { titel: "Feste Preise", text: "Fairer Setup-Preis plus transparente monatliche Betreuung." },
  ],
};

// Kundenstimmen: fertig gebaut, aber über den Schalter in lib/content.ts AUS.
export const stimmen = {
  aktiv: testimonials.aktiv,
  titel: testimonials.headline,
  liste: testimonials.items,
};

// Mauszeiger über Karten und Bildern.
export const zeiger = { ansehen: "Ansehen" };

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
  // Die neue Seite (seite/KontaktBereich.tsx): Anrufen steht klar im Mittelpunkt.
  haupt: "Rufen Sie uns an: Unser KI-Assistent nimmt sofort ab und macht direkt einen Termin mit Ihnen aus.",
  anrufStatus: "KI-Assistent bereit",
  chatHinweis: "Kurze Frage? Unser KI-Chat unten rechts antwortet sofort.",
  whatsapp: "Per WhatsApp schreiben",
  formular: {
    frage: "Lieber schreiben?",
    // Die kleinste Zeile, in der eingeklappten Glaskarte des Formulars.
    antwortzeit: "Meist antworten wir innerhalb eines Werktages.",
    // Was unter einem Pflichtfeld steht, wenn es beim Absenden fehlt.
    fehlt: {
      name: "Bitte tragen Sie Ihren Namen ein.",
      email: "Bitte tragen Sie Ihre E-Mail-Adresse ein.",
      emailFalsch: "Bitte prüfen Sie die E-Mail-Adresse.",
      message: "Bitte schreiben Sie kurz, worum es geht.",
    },
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

/**
 * Chat-Knopf unten rechts. Der Chat selbst gehört zum Stammlayout (components/ChatWidget.tsx)
 * und duzt seine Besucher; die Sprechblase spricht deshalb wie er.
 */
export const chat = {
  oeffnen: "Chat mit Agents Gilt öffnen",
  blase: "Bei Fragen helfe ich dir gerne weiter",
  blaseSchliessen: "Hinweis schließen",
  /**
   * Das Glasfenster der neuen Seite (components/neu/chat). Der Chat duzt. Was der Assistent sagt
   * (Begrüßung, Vorschläge, Hinweise) steht bei der Logik in lib/chat-text.ts und
   * components/chat/useChat.ts; hier stehen nur die Beschriftungen des Fensters.
   */
  fenster: {
    titel: "Chat mit Agents Gilt",
    name: "Agents Gilt",
    ki: "KI-Assistent",
    online: "online",
    team: "Team",
    verbunden: "verbunden",
    schliessen: "Chat schließen",
    griff: "Chat schließen (nach unten wischen)",
    tippt: "Der Assistent schreibt gerade",
    eingabe: "Nachricht an den Assistenten",
    eingabeTeam: "Nachricht an das Team",
    // Der Platzhalter wechselt zwischen diesen Beispielfragen.
    platz: ["Was kostet eine Website?", "Wie schnell seid ihr?", "Was macht ein Telefon-Assistent?"],
    platzTeam: "Schreib dem Team …",
    senden: "Senden",
    istKi: "Agents Gilt ist eine KI",
    mitarbeiter: "Mit einem Mitarbeiter sprechen",
    mitTeam: "Du schreibst mit unserem Team · Antworten erscheinen hier im Chat",
    anrufen: "Jetzt anrufen",
    anfrage: "Anfrage schicken",
    telefonHinweis: "Am Telefon nimmt unser KI-Assistent ab und macht direkt einen Termin aus.",
    ticket: {
      hinweis: "Du schreibst gleich mit einem echten Mitarbeiter aus unserem Team. Er antwortet hier im Chat.",
      weg: "Falls du die Seite verlässt, melden wir uns über den Kontakt, den du angibst.",
      name: "Dein Name",
      kontakt: "E-Mail oder Telefonnummer",
      frage: "Worum geht es?",
      datenschutzVor: "Mit dem Absenden wird dein Anliegen samt Chatverlauf an unser Team übergeben (siehe ",
      datenschutz: "Datenschutz",
      datenschutzNach: ").",
      verbinden: "Verbinden",
      laeuft: "Wird übergeben …",
      abbrechen: "Abbrechen",
      // Was unter einem Pflichtfeld steht, wenn es beim Absenden fehlt.
      fehlt: {
        name: "Bitte trag deinen Namen ein.",
        kontakt: "Bitte gib eine E-Mail-Adresse oder Telefonnummer an.",
        frage: "Bitte schreib kurz, worum es geht.",
      },
    },
  },
};

export const fuss = {
  text: "KI-Lösungen für lokale Unternehmen – moderne Websites, Chatbots, Voice-Agenten und Automatisierungen.",
  rechte: "Alle Rechte vorbehalten.",
};
