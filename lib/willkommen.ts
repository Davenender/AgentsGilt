// Die Anleitungen in #willkommen. Rein, ohne Netz: Texte und der Plan, welche Bot-Nachricht
// geändert und welche neu angelegt wird. Das Ausführen steht in app/api/willkommen/route.ts.
// Nach Plan 3 (Demo-Baukasten) hier ergänzen und die Schnittstelle erneut aufrufen.

export type Feld = { name: string; value: string };
export type Anleitung = {
  titel: string;
  /** Titelanfänge, an denen eine schon vorhandene Bot-Nachricht erkannt wird. Der eigene Titel zählt immer. */
  sucht: string[];
  text?: string;
  felder?: Feld[];
  /** Nur ändern, wenn sie schon da ist (David hat sie vielleicht absichtlich gelöscht). */
  nurWennDa?: boolean;
};
export type Nachricht = { id: string; bot: boolean; titel: string };
export type Schritt = { art: "aendern"; id: string; titel: string } | { art: "neu"; titel: string } | { art: "auslassen"; titel: string };

const klein = (s: string) => s.trim().toLocaleLowerCase("de");

/** Ordnet jeder Anleitung höchstens eine vorhandene Bot-Nachricht zu. Nachrichten von Menschen bleiben unberührt. */
export function planeWillkommen(nachrichten: Nachricht[], anleitungen: Anleitung[]): Schritt[] {
  const frei = nachrichten.filter((n) => n.bot);
  const benutzt = new Set<string>();
  return anleitungen.map((a) => {
    const muster = [a.titel, ...a.sucht].map(klein);
    const treffer = frei.find((n) => !benutzt.has(n.id) && muster.some((m) => klein(n.titel).startsWith(m)));
    if (treffer) {
      benutzt.add(treffer.id);
      return { art: "aendern", id: treffer.id, titel: a.titel };
    }
    return a.nurWennDa ? { art: "auslassen", titel: a.titel } : { art: "neu", titel: a.titel };
  });
}

/**
 * Wie planeWillkommen, aber die Anleitungen stehen danach in der Reihenfolge der Liste: Die vorhandenen
 * Bot-Nachrichten (älteste zuerst) werden der Reihe nach neu belegt, der Rest kommt hinten dazu. Nichts wird gelöscht.
 * Gehört eine Bot-Nachricht zu keiner Anleitung, wäre sie danach überschrieben: dann null (verweigert).
 */
export function planeReihenfolge(nachrichten: Nachricht[], anleitungen: Anleitung[]): Schritt[] | null {
  const bots = nachrichten.filter((n) => n.bot);
  const zuordnung = planeWillkommen(bots, anleitungen);
  const zugeordnet = new Set(zuordnung.flatMap((s) => (s.art === "aendern" ? [s.id] : [])));
  if (bots.some((n) => !zugeordnet.has(n.id))) return null;
  const plaetze = bots.map((n) => n.id);
  return zuordnung.map((s) => {
    if (s.art === "auslassen") return s;
    const id = plaetze.shift();
    return id ? { art: "aendern", id, titel: s.titel } : { art: "neu", titel: s.titel };
  });
}

/** Discord-Grenzen: Text 4096, Feldname 256, Feldwert 1024, Titel 256, alles zusammen 6000. */
export function pruefeLaengen(anleitungen: Anleitung[]): string[] {
  const fehler: string[] = [];
  for (const a of anleitungen) {
    const felder = a.felder ?? [];
    if (a.titel.length > 256) fehler.push(`${a.titel}: Titel zu lang`);
    if ((a.text ?? "").length > 4096) fehler.push(`${a.titel}: Text zu lang (${(a.text ?? "").length})`);
    if (felder.length > 25) fehler.push(`${a.titel}: zu viele Felder`);
    for (const f of felder) {
      if (f.name.length > 256) fehler.push(`${a.titel}: Feldname zu lang`);
      if (f.value.length > 1024) fehler.push(`${a.titel} / ${f.name}: Feld zu lang (${f.value.length})`);
    }
    const summe = a.titel.length + (a.text ?? "").length + felder.reduce((s, f) => s + f.name.length + f.value.length, 0);
    if (summe > 6000) fehler.push(`${a.titel}: insgesamt zu lang (${summe})`);
  }
  return fehler;
}

export function alsEmbed(a: Anleitung, farbe: number) {
  return {
    title: a.titel,
    description: a.text,
    color: farbe,
    ...(a.felder?.length ? { fields: a.felder.map((f) => ({ name: f.name, value: f.value, inline: false })) } : {}),
  };
}

export const GOLD = 0xd4a23c;

const z = (...zeilen: string[]) => zeilen.join("\n");

export const ANLEITUNGEN: Anleitung[] = [
  {
    titel: "Willkommen bei Agents Gilt",
    sucht: [],
    text: z(
      "Dieser Server ist unsere Schaltzentrale. Hier landen Anfragen, Anrufe, Termine, Leads und alles zu unseren Kunden. Vieles läuft automatisch über unseren Bot **Agents Gilt**.",
      "",
      "**So fangt ihr an**",
      "1. Lest diese Seite einmal in Ruhe von oben nach unten. Jede Karte erklärt einen Bereich.",
      "2. Geht danach in die **Akademie** (Kategorie AKADEMIE, Kanal **#akademie**). Dort lernt ihr Schritt für Schritt alles, was ihr für die Arbeit mit Kunden braucht.",
      "3. Wenn etwas unklar ist oder nicht funktioniert, schreibt in **#allgemein**.",
      "",
      "**Die Grundregel:** In fast allen Arbeitskanälen schreibt nur der Bot. Ihr arbeitet dort mit den **Knöpfen** unter den Karten. Daten zu Kunden pflegt ihr **in Notion**, nicht in Discord.",
    ),
  },
  {
    titel: "Die wichtigsten Kanäle",
    sucht: [],
    felder: [
      {
        name: "📨 #anfragen",
        value: "Anfragen aus dem Kontaktformular auf agentsgilt.com. Jede echte Anfrage ist eine Karte mit Knöpfen (Anleitung unten). Werbung sortiert der Bot vorher aus.",
      },
      {
        name: "📞 #anrufe und 📅 #termine",
        value: "Jeder Anruf beim Telefonassistenten erscheint in **#anrufe** als Karte. In **#termine** erinnert der Bot einen Tag und eine Stunde vor jedem bestätigten Termin und markiert die Person, die den Anruf übernommen hat.",
      },
      {
        name: "🗂️ #lead-befehle, #leads, #lead-ablage, #lead-suche",
        value: "In **#lead-befehle** schlagt ihr mit `/lead` neue Firmen vor. Die Karten zum Abstimmen stehen in **#leads**. Abgesagte Leads landen in **#lead-ablage** (nur lesen). In **#lead-suche** findet der Bot Firmen über Google Maps.",
      },
      {
        name: "👥 Kundenkanäle (🔴knd_001, 🟡knd_002 …)",
        value: "Pro Kunde ein eigener Kanal mit der **Kundenkarte** ganz oben. Der Punkt vorne zeigt den Status: 🔴 Lead · 🟡 Angebot gesendet · 🟢 Kunde · ⚪ Verloren. Nur der Bot schreibt dort, ihr drückt die Knöpfe. Verlorene Kunden wandern in die Kategorie **KUNDENARCHIV** (eigene Anleitung unten).",
      },
      {
        name: "🎫 SUPPORT (ticket-0001 …)",
        value: "Hier entstehen die Kanäle für den Live-Chat mit Besuchern der Website. Geschlossene Tickets wandern ins **ARCHIV**.",
      },
      {
        name: "📊 #statistik",
        value: "Die Kunden-Statistik: wie viele Leads es gibt, wie viele Kunden daraus wurden und warum Kunden abgesagt haben. Nur lesen.",
      },
      {
        name: "🎓 AKADEMIE",
        value: "**#akademie** erklärt die Akademie. Jeder von euch hat dort einen eigenen **📖 Lernpfad** und eine eigene **📚 Bibliothek**, die nur ihr selbst seht.",
      },
      {
        name: "🗒️ #notion",
        value: "Protokoll: Hier steht jedes Mal kurz, wenn eine Meldung aus Notion angekommen ist und was der Bot daraus gemacht hat.",
      },
      {
        name: "💬 Team: #allgemein, #aufgaben, #ideen",
        value: "Der normale Team-Chat. Hier dürft ihr ganz normal schreiben.",
      },
      {
        name: "🎧 Sprachkanäle",
        value: "Team-Call, Fokus (ruhiges Arbeiten) und Kundengespräch.",
      },
    ],
  },
  {
    titel: "Notion und Kundenkanäle",
    sucht: [],
    text: z(
      "Die Kundendatenbank in **Notion** ist die Quelle für alles, was einen Kunden betrifft.",
      "",
      "• **Neue Zeile in Notion = neuer Kundenkanal** (knd_003, knd_004 …) mit Kundenkarte. Meistens entsteht die Zeile von selbst, wenn ihr bei einer Lead-Karte oder Anfrage **Lead aktiv** drückt.",
      "• **Änderung in Notion = Karte wird aktualisiert.** Darunter steht im Kanal eine kurze Zeile, was sich geändert hat (zum Beispiel „Status: Lead → Angebot geschickt“).",
      "• **Notizen, Gesprächsnotizen und alles Wichtige kommen in Notion**, nicht in den Kanal. Jeder Kunde hat dort auch einen **🗣️ Gesprächsbogen** für das Erstgespräch.",
      "• **Zuständig** ist, wer den Lead übernommen hat. Das steht auf der Karte und wird mit dem Knopf **👥 Zuständige** geändert. Ändert jemand das Feld in Notion von Hand, setzt der Bot es auf den Stand der Karte zurück.",
      "• Die Beispiel-Zeile in Notion wird absichtlich ausgelassen.",
      "",
      "Deshalb: Kundendaten **immer in Notion** pflegen. Im Kanal arbeitet ihr nur mit den Knöpfen.",
    ),
  },
  {
    titel: "📖 Anleitung: Kundenkanal und Kundenkarte",
    sucht: [],
    text: z(
      "**Die Kundenkarte** steht ganz oben im Kundenkanal und wird automatisch aus Notion aktualisiert. Darauf steht:",
      "• **Status** (Lead, Gespräch, Angebot geschickt, Kunde, Verloren …), **Angebot** und **Zuständig**",
      "• **Demo**: ob eine Vorführung angefragt, in Arbeit oder fertig ist, mit Link",
      "• **Fortschritt** und **Zeit gesamt** des Projekts, **Zahlungsstatus**",
      "• **Setup-Preis** und **Retainer pro Monat**",
      "• **Quelle**, **E-Mail**, **Telefon**",
      "• **Nächster Termin** (aus „Nächstes Follow-up“ in Notion) und **Nächster Schritt**",
      "• die **Checkliste** (✅ erledigt, ⬜ offen) und ein Link zur Kundenseite in Notion",
      "",
      "**Die Knöpfe unter der Karte**",
      "• **👥 Zuständige:** Wer kümmert sich um den Kunden? Du wählst eine oder mehrere Personen aus dem Team.",
      "• **📝 Gesprächsbogen:** öffnet den Bogen für das Erstgespräch in Notion. Fehlt er, legt der erste Klick ihn an.",
      "• **🧠 Gespräch auswerten:** liest deine Notizen im Bogen und fasst zusammen. Das Ergebnis steht danach im Bogen und als Karte im Kanal. In Notion trägt der Bot „Nächster Schritt“ ein, das Follow-up nur, wenn ein Datum genannt wurde. Angebot und Quelle füllt er nur, wenn sie leer sind. Status, Preise, Zuständige und Häkchen ändert er nie.",
      "• **🎨 Demo anfragen:** fragt bei David eine Vorführung für den Kunden an (mit roter Bestätigung). David entscheidet und baut sie. Der Stand und später der Link stehen auf der Karte.",
      "• **⚪ Verloren:** wenn der Kunde endgültig absagt. Du wählst den Grund und bestätigst rot. In Notion steht dann „Verloren“ mit Grund, und der Kanal wandert ins **KUNDENARCHIV**.",
      "• **↩️ Wieder aufnehmen** (nur im Archiv): Der Kunde meldet sich doch wieder. Der Kanal kommt zurück, der Status wird wieder „Lead“.",
      "",
      "**Wer darf drücken?** Die Knöpfe können nur die **Zuständigen** und **David** benutzen. Alle anderen bekommen eine private Meldung, und es passiert nichts.",
      "",
      "**Was sonst im Kanal erscheint:** Änderungen aus Notion, Mails des Kunden (die Mail kommt automatisch in seinen Kanal) und Zahlungen über Stripe.",
    ),
  },
  {
    titel: "📖 Anleitung: Lead-Karten (neue Unternehmen vorschlagen)",
    sucht: ["📖 Anleitung: Lead-Karten"],
    text: z(
      "**1. Vorschlagen** (nur im Kanal **#lead-befehle**, nur du siehst die Antwort des Bots). Es gibt drei Wege:",
      "• **Mit Website:** `/lead link: www.beispiel.de`. Der Bot liest Startseite, Kontakt und Impressum.",
      "• **Mit Google-Maps-Link:** `/lead link:` und den Link aus Google Maps einfügen (in Maps auf „Teilen“ → „Link kopieren“).",
      "• **Ohne Website:** `/lead name: Bäckerei Schmitt ort: Mühlheim`. Der Bot sucht die Firma bei Google Maps.",
      "Findet der Bot nichts (oder du schreibst nur `/lead`), erscheint **📝 Formular öffnen**. Dort trägst du Firma, Ort, Telefon, Ansprechpartner und eine Notiz ein.",
      "",
      "**2. Die Karte in #leads** zeigt Firma, Branche, Telefon, E-Mail, Ansprechpartner, Adresse, eine Zusammenfassung, was an der Website auffällt und welche unserer Leistungen passen könnte. Der Bot schreibt und ruft nie selbst an.",
      "",
      "**3. Abstimmen:** Jeder klickt **Passt** (grün) oder **Passt nicht** (rot). Zwei gleiche Stimmen entscheiden, die eigene Stimme lässt sich ändern. Bei zweimal „Passt nicht“ fragt der Bot nach: **Sicher ablehnen** löscht die Karte, und die Firma wird nie wieder vorgelegt. **Abbrechen** nimmt die Ablehnung zurück.",
      "",
      "**4. Übernehmen:** Nach zweimal „Passt“ wird die Karte grün. Wer bei der Firma anruft, drückt **Übernehmen**. Nur diese Person (und David) kann danach die Knöpfe drücken. **Freigeben** gibt den Lead wieder ab.",
      "",
      "**5. Status setzen:** **Offen · In Arbeit · Kontaktiert**. Nach „Kontaktiert“ erscheint **Lead aktiv**: Die Firma kommt in Notion zu den Kunden, du wirst dort **Zuständig**, und der Kundenkanal entsteht von selbst.",
      "• **Kunde: Kein Interesse** nur, wenn der Kunde absagt. Die Karte wandert nach **#lead-ablage**.",
      "• **Aussortieren** (mit Rückfrage): Ihr nehmt die Firma gerade doch nicht. Sie wird nicht gesperrt und kann später wieder vorgeschlagen werden.",
      "",
      "**Doppelte:** Schlägt jemand dieselbe Firma noch einmal vor, verweist der Bot auf die bestehende Karte.",
      "**Löschen (nur David):** `/lead-delete` mit dem Link.",
      "**Hinweis:** Nur kontaktieren, wenn es rechtlich zulässig ist (Kaltakquise, UWG §7).",
    ),
  },
  {
    titel: "📖 Anleitung: Lead-Suche (Firmen finden)",
    sucht: ["📖 Anleitung: Lead-Suche"],
    nurWennDa: true,
    text: z(
      "Die ausführliche Anleitung zur Lead-Suche steht direkt im Kanal **#lead-suche**. Kurz:",
      "• **Suche starten** drücken, den Code aus deiner Direktnachricht eingeben, dann bist du 60 Minuten freigeschaltet.",
      "• Branchen, Umkreis, Website-Art und Sortierung einstellen. Die Treffer kommen in einen privaten Thread, den nur du siehst.",
      "• Auf jeder Karte: **Zur Abstimmung** (kommt nach #leads), **Später**, **Verwerfen**, **Notiz**, **Karte**.",
      "• 3 Suchen pro 24 Stunden für das ganze Team.",
    ),
  },
  {
    titel: "📖 Anleitung: Anfragen von der Website",
    sucht: ["📖 Anleitung: Anfragen"],
    text: z(
      "Besucher füllen auf agentsgilt.com das Kontaktformular aus: Name, E-Mail, Unternehmen, gewünschte Leistung und Nachricht. Echte Anfragen erscheinen als Karte in **#anfragen**. Werbung und Verdächtiges sortiert der Bot vorher aus.",
      "",
      "**Ablauf**",
      "1. **Übernehmen:** Wer sich kümmert, drückt Übernehmen. Nur diese Person (und David) kann dann die anderen Knöpfe drücken. **Freigeben** gibt die Anfrage wieder ab.",
      "2. **Status:** Offen · In Arbeit · Kontaktiert. Meldet euch beim Interessenten (Mail oder Telefon stehen auf der Karte).",
      "3. **Lead aktiv** (erscheint nach „Kontaktiert“): Die Anfrage kommt in Notion zu den Kunden, du wirst **Zuständig**, und die Anfrage wandert in den neuen Kundenkanal.",
      "4. **Bestehender Kunde?** Ist es ein Kunde, den wir schon haben, sucht ihr ihn mit **Kunde suchen** (Name, E-Mail oder KND-Nummer) heraus, und die Anfrage kommt in seinen Kundenkanal.",
      "5. **Erledigt:** wenn nichts weiter zu tun ist.",
    ),
  },
  {
    titel: "📖 Anleitung: Support-Chat auf der Website",
    sucht: ["📖 Anleitung: Support-Chat", "📖 **Anleitung: Support-Chat"],
    text: z(
      "**Wie es abläuft**",
      "1. Ein Besucher klickt im Website-Chat auf „mit einem Mitarbeiter sprechen“, gibt Name, Kontakt und Anliegen an und schickt es ab.",
      "2. Im Bereich **SUPPORT** entsteht ein Kanal `ticket-000X` mit einer Karte (Name, Kontakt, Frage, bisheriger Chat) und einem Ping ans Team. Zusätzlich kommt eine E-Mail.",
      "3. Wer sich kümmert, klickt **Übernehmen**. Der Besucher sieht dann deinen Namen und „Du bist jetzt mit einem Mitarbeiter verbunden“.",
      "4. Danach einfach **normal in den Kanal schreiben**. Der Besucher sieht die Nachricht im Chat mit deinem Namen. Rechtschreibung, Groß- und Kleinschreibung und Kommas glättet der Bot.",
      "5. Was der Besucher schreibt, erscheint im Kanal als „🗨️ Besucher: …“.",
      "",
      "**Gut zu wissen**",
      "• **Interne Notiz:** Nachricht mit `//` beginnen, dann sieht der Besucher sie nicht.",
      "• **Besucher weg:** Verlässt er die Seite, meldet der Bot das mit ❗. Kommt er zurück, steht dort ✅. Antworten kommen nur an, solange er im Chat ist, sonst über den Kontakt in der Karte melden.",
      "• **Schließen:** Mit **Ticket schließen** wandert der Kanal ins **ARCHIV** und ist nur noch lesbar.",
      "• Der KI-Chatbot nennt nie Preise. Bei Preisfragen, beim Wunsch nach einem Menschen oder bei Problemen bietet er den Mitarbeiter-Chat an.",
    ),
  },
  {
    titel: "So läuft ein Anruf",
    sucht: [],
    text: z(
      "**1. Anruf kommt rein.** Der Telefonassistent nimmt an, fragt Name, Betrieb, Anliegen und Wunschtermin und trägt den Termin als „VORLÄUFIG“ in den Kalender ein. Der Kunde hört: Der Termin ist vorgemerkt, eine SMS folgt.",
      "",
      "**2. Karte in #anrufe.** Wer den Anruf bearbeitet, klickt **Übernehmen**. Die Karte wird blau, der Name steht als Bearbeiter dabei.",
      "",
      "**3. Termin passt:** **Termin bestätigen (SMS)**. Der Kunde bekommt eine SMS, der Kalendereintrag verliert das „VORLÄUFIG“, und die Karte wird grün.",
      "",
      "**4. Termin passt nicht:** **Anderen Termin vorschlagen**, Datum und Uhrzeit eintragen (werktags 9 bis 17 Uhr). Der Kunde bekommt eine SMS mit dem Vorschlag und einem Link. Dort sagt er „Passt“ oder wählt eine andere Zeit. Seine Antwort erscheint auf der Karte (violett), und ihr könnt bestätigen oder neu vorschlagen. Ist die Zeit im Kalender schon belegt, geht keine SMS raus.",
      "",
      "**5. Nur Rückruf, kein Termin:** Nach dem Zurückrufen auf **Erledigt** klicken.",
      "",
      "**6. Vor dem Termin** erinnert der Bot in **#termine**, am Vortag und eine Stunde vorher.",
      "",
      "Farben: 🟡 offen · 🔵 übernommen · 🟠 wartet auf den Kunden · 🟣 Kunde wünscht anderen Termin · 🟢 Termin steht · ⚪ erledigt.",
    ),
  },
  {
    titel: "📖 Anleitung: Anrufe (Karten in #anrufe)",
    sucht: ["📖 Anleitung: Anrufe"],
    text: z(
      "**Ablauf**",
      "1. Jeder Anruf beim KI-Assistenten kommt als Karte in **#anrufe**: Anrufer, Betrieb, Rückrufnummer, Terminwunsch, Zusammenfassung und Dauer. Das ganze Gespräch steht zusätzlich in der Mail.",
      "2. **Übernehmen:** Wer sich kümmert, drückt Übernehmen. Sein Name steht als **Bearbeiter** auf der Karte.",
      "3. **Nur der Bearbeiter** (und David) kann danach die Knöpfe benutzen. Alle anderen bekommen eine private Meldung.",
      "",
      "**Die Knöpfe**",
      "• **Termin bestätigen (SMS):** Der Kunde bekommt eine Bestätigung per SMS, der vorläufige Kalendereintrag wird angepasst.",
      "• **Anderen Termin vorschlagen:** Ein kleines Fenster fragt Datum und Uhrzeit. Der Kunde bekommt eine SMS mit Link und bestätigt oder wünscht einen anderen Termin. Die Karte zeigt, wie es steht.",
      "• **Erledigt:** schließt die Karte, zum Beispiel wenn nur zurückgerufen wurde.",
      "• **Freigeben:** gibt den Anruf wieder ab. Dann kann jemand anderes **Übernehmen**. Der Stand (zum Beispiel „Vorschlag gesendet“) bleibt erhalten.",
      "",
      "**Erinnerungen:** Zu bestätigten Terminen kommen Erinnerungen in **#termine** (am Vortag und eine Stunde vorher), mit Erwähnung des Bearbeiters.",
    ),
  },
  {
    titel: "📖 Anleitung: Telefon-Rufgruppe",
    sucht: ["📖 Anleitung: Telefon-Rufgruppe"],
    text: z(
      "**Wenn jemand beim KI-Assistenten einen Menschen verlangt**, klingeln **gleichzeitig die Handys von Mijo und Jakob**. Der Anruf kommt von **+49 6108 9694027**. Bitte als Kontakt speichern, zum Beispiel „Agents Gilt“.",
      "",
      "**1. Abnehmen und die 1 drücken.** Wer abnimmt, hört „Anruf von Agents Gilt. Drücken Sie die 1“ und muss **die 1 drücken**. Erst dann wird verbunden. So nimmt keine Mailbox und kein Anruffilter den Anruf an.",
      "**2. Niemand nimmt ab** (nach etwa 25 Sekunden): Der Anrufer hört eine Ansage, dass gerade niemand aus dem Team erreichbar ist, und in **#anrufe** steht eine Meldung mit seiner Nummer. Bitte zurückrufen.",
      "",
      "**Damit es klappt:**",
      "• Die congstar-Mailbox ausschalten: in der Telefon-App `##002#` wählen und anrufen.",
      "• iPhone: Einstellungen → Apps → Telefon → „Unbekannte Anrufer filtern“ auf **Nie**, und bei „Nicht stören“ eine Ausnahme für die Nummer.",
    ),
  },
  {
    titel: "📖 Anleitung: Mails und Zahlungen",
    sucht: [],
    text: z(
      "**Mails von Kunden:** Schreibt ein Kunde an kontakt@agentsgilt.com, erkennt der Bot ihn an seiner Mail-Adresse aus Notion. Die Mail erscheint dann automatisch als Meldung in seinem **Kundenkanal**. Geantwortet wird aus dem Postfach. Ihr müsst nichts weiterleiten.",
      "",
      "**Zahlungen über Stripe:** Bezahlt ein Kunde über einen Zahlungslink, läuft alles von selbst:",
      "• In seinem **Kundenkanal** erscheint eine Zahlungskarte (bezahlt, fehlgeschlagen oder Abo beendet), mit einem Ping ans Team (nur die normale monatliche Abbuchung kommt ohne Ping).",
      "• In Notion wird der **Zahlungsstatus** gesetzt, und er steht auf der Kundenkarte.",
      "• David bekommt zusätzlich eine Mail.",
      "",
      "Preise, Verträge und Rechnungen gehen nie ohne Davids OK an einen Kunden.",
    ),
  },
  {
    titel: "📖 Anleitung: Statistik",
    sucht: [],
    text: z(
      "In **#statistik** steht eine Karte **📊 Kunden-Statistik**. Dort schreibt nur der Bot.",
      "",
      "**Was sie zeigt**",
      "• **Von der Lead-Karte zum Kunden:** wie viele Lead-Karten es gab, wie viele davon aktive Leads in Notion wurden, mit wie vielen ein Gespräch geführt wurde, wie viele ein Angebot bekamen, wie viele Kunde wurden und wie viele verloren gingen. Dazu die **Abschlussquote**.",
      "• **Die letzten 30 Tage:** neue Lead-Karten und neue aktive Leads.",
      "• **Häufigste Verlustgründe:** die Gründe, die ihr bei **⚪ Verloren** gewählt habt.",
      "• **Je Person:** wie viele Leads jeder übernommen und wie viele Kunden jeder gewonnen hat.",
      "",
      "**Wann sie neu kommt:** am 1. jedes Monats automatisch. Mit dem Knopf **🔄 Aktualisieren** jederzeit. Im selben Monat wird die Karte aktualisiert statt neu angelegt.",
      "",
      "Übungskunden (zum Beispiel die Übungs-Demo) zählen nicht mit.",
    ),
  },
  {
    titel: "📖 Anleitung: Akademie",
    sucht: [],
    text: z(
      "In der Kategorie **AKADEMIE** lernt ihr alles, was ihr für die Arbeit mit Kunden braucht. Die ausführliche Anleitung steht in **#akademie**. Kurz:",
      "",
      "• **📖 Lernpfad (euer eigener Kanal):** Mit **📖 Weiterlernen** kommt die nächste Lektion. Unten auf **✅ Gelesen** drücken, dann verschwindet sie und der Fortschritt wird gespeichert. Am Ende jeder Einheit kommt ein kurzer **Test**.",
      "• **Test:** Ab **80 %** richtig ist er bestanden. Sonst zeigt der Bot, welche Lektionen ihr nachlesen solltet, und ihr könnt sofort noch einmal.",
      "• **Wiederholen:** Auf der Lernpfad-Karte über die Auswahl **Lektion wiederholen** jede gelesene Lektion noch einmal öffnen.",
      "• **📚 Bibliothek (euer eigener Kanal):** das Inhaltsverzeichnis aller freigegebenen Lektionen zum Nachschlagen. Eine Lektion auswählen, und sie erscheint ganz. Mit **🔎 Suchen** nach einem Wort suchen, mit **🧹 Aufräumen** alles wieder wegräumen.",
      "",
      "Lernpfad und Bibliothek seht nur ihr selbst (und David). Neue Lektionen kommen nach und nach dazu.",
    ),
  },
  {
    titel: "📖 Befehle",
    sucht: [],
    text: z(
      "• `/lead link: …` legt eine Lead-Karte an, mit der Website oder einem Google-Maps-Link (nur in #lead-befehle)",
      "• `/lead name: … ort: …` legt eine Lead-Karte für eine Firma ohne Website an (nur in #lead-befehle)",
      "• `/lead` ohne Angaben öffnet den Knopf zum Formular",
      "• `/lead-delete link: …` löscht eine Karte oder hebt eine Ablehnung auf (nur David)",
      "• `/close` schließt deinen Such-Thread der Lead-Suche vorzeitig (nur im eigenen Thread)",
    ),
  },
  {
    titel: "Gut zu wissen",
    sucht: [],
    text: z(
      "• In #anfragen, #anrufe, #termine, #leads, #statistik, #notion, den Kundenkanälen und der Akademie schreibt nur der Bot. Dort arbeiten die Knöpfe.",
      "• Den Bot nicht einladen, ändern oder entfernen. Er gehört zur Rolle **Agents Gilt**.",
      "• Kundendaten sind vertraulich: nichts davon weitergeben oder außerhalb des Teams posten.",
      "• Bekommst du beim Drücken eine private Meldung wie „Nur die Zuständigen …“, ist das kein Fehler. Der Knopf gehört dann jemand anderem.",
      "• Fragen oder etwas kaputt? In **#allgemein** schreiben.",
    ),
  },
];
