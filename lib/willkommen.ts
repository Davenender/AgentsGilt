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
        name: "💶 #zahlungen",
        value: "Zahlungen über Stripe erscheinen inzwischen automatisch im **Kundenkanal** des Kunden und setzen den Zahlungsstatus in Notion (Anleitung „Mails und Zahlungen“ unten).",
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
      "**Farbpunkt vor der Kundennummer:** In Notion (Spalte „Stand“ vor der KND-Nr.) und vor dem Kanalnamen in Discord (zum Beispiel 🔴knd_003) zeigt ein Punkt, wie weit ein Kunde ist:",
      "🔴 **Lead**: neu angelegt, noch nichts passiert",
      "🟡 **Angebot gesendet**: Kontakt läuft, es sind noch Schritte nötig",
      "🟢 **Kunde / Retainer läuft**: gekauft, es läuft nur noch der Retainer",
      "⚪ **Verloren**: der Kanal liegt im KUNDENARCHIV",
      "Der Punkt richtet sich nach dem **Status in Notion**. Ihr ändert also nur den Status, Discord zieht nach (meist sofort, spätestens nach einer Stunde).",
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
      "**3. Abstimmen:** Jeder klickt **Passt** (grün) oder **Passt nicht** (rot). Die Karte zeigt „1 von 2“. Zwei gleiche Stimmen entscheiden, die eigene Stimme lässt sich ändern, solange noch nicht entschieden ist. Bei zweimal „Passt nicht“ fragt der Bot nach: **Sicher ablehnen** löscht die Karte, und die Firma wird nie wieder vorgelegt. **Abbrechen** nimmt die Ablehnung zurück.",
      "",
      "**4. Übernehmen:** Nach zweimal „Passt“ wird die Karte grün. Wer bei der Firma anruft, drückt **Übernehmen**. Sein Name steht dann auf der Karte („Übernommen von“), so weiß jeder, wer dran ist. Nur diese Person (und David) kann danach die Knöpfe drücken. **Freigeben** gibt den Lead wieder ab. Ist er frei, kann niemand die Status-Knöpfe drücken, bis ihn jemand übernimmt.",
      "",
      "**5. Status setzen:** **Offen · In Arbeit · Kontaktiert**. Nach „Kontaktiert“ erscheint **Lead aktiv**: Die Firma kommt in Notion zu den Kunden, du wirst dort **Zuständig**, und der Kundenkanal entsteht von selbst.",
      "• **Kunde: Kein Interesse** nur, wenn der Kunde absagt. Die Karte wandert nach **#lead-ablage**.",
      "• **Aussortieren** (mit Rückfrage): Ihr nehmt die Firma gerade doch nicht. Sie wird nicht gesperrt und kann später wieder vorgeschlagen werden.",
      "",
      "**Karten aus der Lead-Suche** tragen oben „🔎 Aus der Lead-Suche“ und im Fuß „per Suche“. Sie laufen genauso weiter.",
      "",
      "**Doppelte:** Schlägt jemand dieselbe Firma noch einmal vor, verweist der Bot auf die bestehende Karte oder sagt, dass sie abgelehnt wurde.",
      "**Löschen (nur David):** `/lead-delete` mit dem Link.",
      "**Hinweis:** Nur kontaktieren, wenn es rechtlich zulässig ist (Kaltakquise, UWG §7).",
    ),
  },
  {
    titel: "📖 Anleitung: Lead-Suche (Firmen finden)",
    sucht: ["📖 Anleitung: Lead-Suche"],
    nurWennDa: true,
    text: "**Wo:** Kanal **#lead-suche** (Kategorie Team). Der Bot findet Firmen über Google Maps, am liebsten solche ohne oder mit schlechter Website.\n\n**1. Freischalten:** **Suche starten** drücken. Der Bot schickt dir einen **Code per Direktnachricht** (gilt einmal, 15 Minuten). Mit **Code eingeben** schaltest du dich **60 Minuten** frei, die Restzeit läuft oben mit. Wer in der Zeit wieder „Suche starten“ drückt, braucht keinen neuen Code. Die Suchzentrale verschwindet, wenn du Discord neu lädst.\n**2. Einstellen:** Auswahlfelder für **Branchen** (bis zu 4), **Umkreis** (1 bis 50 km, die Karte zeigt den Kreis), **Website-Art** (ohne Website, nur Facebook & Co., schlechte Website, gute Website) und **Sortierung**. Mit **Ort & Filter** änderst du den Ort (Standard Mühlheim am Main), nennst eigene Branchen und stellst Mindestbewertung und Mindestanzahl der Bewertungen ein. **Nur neue Firmen** (standardmäßig an) blendet alles aus, was ihr schon gesehen oder bearbeitet habt.\n**3. Suchen:** **Suche starten** legt einen **privaten Thread** an, den nur du siehst, mit bis zu **5 Karten** und einer Karte mit nummerierten Markern. Der Thread schließt sich nach einem Tag von selbst, oder du tippst `/close` im Thread.\n\n**Auf jeder Karte:** Bewertung, Entfernung, Website, Öffnungszeiten (🟢 gerade geöffnet / 🔴 geschlossen) und die Knöpfe\n• **Zur Abstimmung** → die Karte kommt als normale Abstimmungskarte nach #leads (mit @Team-Ping)\n• **Später** → wird nach 30 Tagen wieder vorgeschlagen\n• **Verwerfen** → wird bei „Nur neue Firmen“ nicht wieder gezeigt (mit **Zurücknehmen** rückgängig)\n• **Notiz** → eine Zeile, die auf der Karte steht und nach #leads mitwandert\n• **Karte** → öffnet die Firma in Google Maps\n\n**📊 Woche:** zeigt je Woche, wie viele Treffer zur Abstimmung kamen, angenommen und zu aktiven Leads wurden.\n**Limit:** 3 Suchen pro 24 Stunden für das ganze Team. Jede Suche wird 24 Stunden nach dem Start wieder frei (Timer in der Suchzentrale). Die Meldung „… hat gesucht“ im Kanal verschwindet nach 24 Stunden. Eine Suche kostet etwa 10 Cent.\n**Hinweis:** Nur kontaktieren, wenn es rechtlich zulässig ist (Kaltakquise).",
  },
  {
    titel: "📖 Anleitung: Anfragen (Karten in #anfragen)",
    sucht: ["📖 Anleitung: Anfragen"],
    text: "**Woher kommen Anfragen?** Besucher der Website füllen das Kontaktformular aus (Name, E-Mail, Unternehmen, gewünschte Leistung, Nachricht). Was echt aussieht, erscheint als Karte in **#anfragen**, und alle im Team bekommen einen **Push aufs Handy**.\n\n**Ablauf**\n1. **Übernehmen:** Wer sich kümmert, drückt Übernehmen. Sein Name steht als **Übernommen von** auf der Karte. **Nur dieser Bearbeiter** (und David) kann danach die weiteren Knöpfe benutzen. Mit **Freigeben** gibt er die Anfrage wieder ab.\n2. **Status:** **Offen**, **In Arbeit**, **Kontaktiert**. Der aktuelle Status ist blau hervorgehoben.\n3. **Lead aktiv** (erscheint erst bei „Kontaktiert“): Der Bot legt den Kunden in **Notion** an (Quelle „Website / Chatbot“), und du wirst dort **Zuständig**. Der **Kundenkanal** (knd_00X) entsteht automatisch, die Anfrage steht dort als erste Nachricht, und die Karte in #anfragen wird gelöscht.\n4. **Bestehender Kunde?** Wenn ein Kunde, den wir schon haben, über die Website schreibt: Der Knopf zeigt die Kunden aus Notion (bei mehr als 25 mit Suche nach Name, E-Mail oder KND-Nummer). Nach der Auswahl wandert die Anfrage in dessen Kanal, die Karte verschwindet.\n5. **Erledigt:** schließt die Anfrage (Karte grau, keine Knöpfe mehr), zum Beispiel wenn sich alles per Telefon geklärt hat.\n\n**Antworten per Mail:** Zu jeder Anfrage kommt eine Mail an kontakt@agentsgilt.com („Neue Projekt-Anfrage von …“). Klickt man dort in Gmail auf **Antworten**, geht die Antwort direkt an den Besucher. Der Besucher bekommt außerdem automatisch eine Bestätigungsmail.",
  },
  {
    titel: "📖 Anleitung: Support-Chat auf der Website",
    sucht: ["📖 Anleitung: Support-Chat"],
    text: "**Wie es abläuft**\n1. Ein Besucher klickt im Website-Chat auf „mit einem Mitarbeiter sprechen“, gibt Name, Kontakt und Anliegen an und schickt es ab.\n2. Im Bereich **SUPPORT** entsteht ein Kanal `ticket-000X` mit einer Karte (Name, Kontakt, Frage, bisheriger Chat) und einem @Team-Ping. Zusätzlich kommen eine E-Mail und ein **Push aufs Handy**.\n3. Wer sich kümmert, klickt **Übernehmen**. Der Besucher sieht dann seinen Namen und „Du bist jetzt mit einem Mitarbeiter verbunden und kannst direkt schreiben.“\n4. Danach einfach **normal in den Kanal schreiben**. Der Besucher sieht die Nachricht im Chat mit eurem Namen (David, Jakob, Mijo). Rechtschreibung, Groß-/Kleinschreibung und Kommas glättet der Bot automatisch.\n5. Was der Besucher schreibt, erscheint im Kanal als „🗨️ Besucher: …“.\n\n**Gut zu wissen**\n• **Interne Notiz:** Nachricht mit `//` beginnen, dann sieht der Besucher sie nicht.\n• **Besucher weg:** Verlässt er die Seite, meldet der Bot das mit ❗. Meldet er sich wieder, steht dort ✅. Antworten kommen nur an, solange er im Chat ist, sonst über den Kontakt in der Karte melden.\n• **Schließen:** Mit **Ticket schließen** wird der Kanal zu `geschlossen-ticket-000X`, wandert in **ARCHIV** und ist nur noch lesbar.\n• Der KI-Chatbot nennt nie Preise und bietet bei Preisfragen, Wunsch nach einem Menschen oder Problemen den Mitarbeiter-Chat an.",
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
    text: "**Ablauf**\n1. Jeder Anruf beim KI-Assistenten kommt als Karte in **#anrufe**: Anrufer, Betrieb, Rückrufnummer, Terminwunsch, Zusammenfassung, Dauer. Das Gespräch steht zusätzlich in der Mail.\n2. **Übernehmen:** Wer sich kümmert, drückt Übernehmen. Sein Name steht als **Bearbeiter** auf der Karte.\n3. **Nur der Bearbeiter** (und David) kann danach die Knöpfe benutzen. Alle anderen bekommen eine private Meldung.\n4. **Gespräch ansehen:** Den Knopf gibt es nach dem Übernehmen (und er bleibt auch nach Erledigt). **Jeder im Team** darf ihn drücken, auch ohne den Anruf übernommen zu haben, zum Beispiel um dem Bearbeiter zu helfen („was antwortet man am besten?“). Der **ganze Gesprächsverlauf** (KI und Anrufer, Zeile für Zeile) erscheint als Nachricht **nur für den, der gedrückt hat**. Bei älteren Karten fehlt er.\n\n**Die Knöpfe (es wird immer zuerst per SMS versucht)**\n• **Termin bestätigen (SMS):** Der Kunde bekommt eine Bestätigung per SMS, der vorläufige Kalendereintrag wird angepasst.\n• **Anderen Termin vorschlagen:** Ein kleines Fenster fragt Datum und Uhrzeit. Der Kunde bekommt eine SMS mit Namen und kurzem Link. Auf der Seite sagt er „Passt“ oder wählt eine andere Zeit. Die Karte zeigt, wie es steht.\n• **Erledigt:** schließt die Karte (z. B. wenn nur zurückgerufen wurde).\n• **Freigeben:** gibt den Anruf wieder ab. Dann kann ein anderer **Übernehmen**. Der Stand bleibt erhalten.\n\n**Wenn keine SMS möglich ist** (z. B. Festnetz), steht auf der Karte „❌ Keine SMS möglich“ und ihr seht statt der SMS-Knöpfe:\n• **Termin per Rückruf bestätigen:** Der KI-Assistent ruft den Kunden an, nennt den Termin und fragt, ob er passt. Sagt der Kunde Ja, ist der Termin bestätigt (Karte grün, Kalender angepasst).\n• **Anderen Termin per Rückruf vorschlagen:** Ihr gebt Datum und Uhrzeit ein, der Assistent ruft sofort an und bietet den Termin an. Nennt der Kunde eine andere Zeit, steht sie als Wunsch (violett) auf der Karte, und ihr bestätigt oder schlagt neu vor.\n**Rückruf auch, wenn eine SMS möglich wäre:** In der zweiten Reihe steht neben „Gespräch ansehen“ ein kleines **graues Telefon-Symbol**. Ein Klick schaltet die Karte auf die zwei Rückruf-Knöpfe um, zum Beispiel wenn der Kunde auf die SMS nicht antwortet. Das graue SMS-Symbol schaltet wieder zurück. Auf der Karte steht dann „Per Rückruf gewählt“.\nBeim Rückruf gibt es **keine SMS**. Der Stand steht im Feld **Rückruf** auf der Karte, und nach jedem Anruf kommt eine Mail mit Ergebnis und Gesprächsverlauf.\n\n**Zeiten und Wiederholen:** Es wird nur täglich von **8 bis 22 Uhr** angerufen (sonst startet der Anruf ab 8 Uhr). Geht niemand ran oder meldet sich die Mailbox, versucht es der Assistent nach 3 Stunden noch einmal, höchstens **3-mal**. Auf der Mailbox hinterlässt er nur die Bitte um Rückruf. Danach steht auf der Karte „bitte selbst anrufen“.\n\n**Ruft ein Kunde zurück, den wir nicht erreicht haben** (auf der Karte steht „Geplant: Versuch …“), hört er eine kurze Ansage („Wir rufen Sie sofort zurück, bitte legen Sie auf“), und der **Rückruf-Assistent ruft ihn sofort an**, auch außerhalb von 8 bis 22 Uhr. Nur in diesem Fall. Sonst geht jeder Anruf wie gewohnt zum normalen Assistenten.\n\n**Ruft derselbe Kunde noch einmal an**, solange die Karte offen ist, wird sie ergänzt („📞 Erneuter Anruf“), statt dass eine neue entsteht. Nach **Erledigt** oder einer Bestätigung gibt es wieder eine neue Karte.\n\n**Fragt ein Anrufer nach seinem Termin,** bietet ihm der Assistent an, ihn mit dem Team zu verbinden. Bestätigen oder ändern kann der Kunde am Telefon nichts, das geht nur über den SMS-Link oder den Rückruf.\n\n**Erinnerungen:** Zu bestätigten Terminen kommen Erinnerungen in **#termine** (am Vortag und eine Stunde vorher), mit Erwähnung des Bearbeiters.",
  },
  {
    titel: "📖 Anleitung: Telefon-Rufgruppe",
    sucht: ["📖 Anleitung: Telefon-Rufgruppe"],
    text: z(
      "**Wenn jemand beim KI-Assistenten einen Menschen verlangt** (oder sich mit dem Team verbinden lassen möchte, zum Beispiel wegen seines Termins), klingeln **gleichzeitig die Handys von Mijo und Jakob**. Der Anruf kommt von **+49 6108 9694027**. Bitte als Kontakt speichern, zum Beispiel „Agents Gilt“.",
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
      "**Mails von Kunden:** Schreibt ein Kunde, dessen Adresse in Notion im Feld **E-Mail** steht, an kontakt@agentsgilt.com, erscheint die Mail mit kurzer Zusammenfassung in seinem **Kundenkanal**, und das Team wird erwähnt. In Gmail bekommt die Unterhaltung automatisch das Label **„Kunden/Kunde - 00X“**. Geantwortet wird weiterhin direkt in Gmail. Ihr müsst nichts weiterleiten.",
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
      "• In #anfragen, #anrufe, #termine, #zahlungen, #leads, #statistik, #notion, den Kundenkanälen und der Akademie schreibt nur der Bot. Dort arbeiten die Knöpfe.",
      "• Den Bot nicht einladen, ändern oder entfernen. Er gehört zur Rolle **Agents Gilt**.",
      "• Kundendaten sind vertraulich: nichts davon weitergeben oder außerhalb des Teams posten.",
      "• Bekommst du beim Drücken eine private Meldung wie „Nur die Zuständigen …“, ist das kein Fehler. Der Knopf gehört dann jemand anderem.",
      "• Fragen oder etwas kaputt? In **#allgemein** schreiben.",
    ),
  },
];
