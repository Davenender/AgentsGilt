import { NextResponse } from "next/server";
import { findChannelId, listMessages } from "@/lib/discord";
import type { EmbedLike } from "@/lib/discord-calls";
import { call } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmalig: aktualisiert die Anleitungen in #willkommen und legt neue an. Danach entfernen.

const LEADS =
  "**Ablauf**\n" +
  "1. Im Kanal **#lead-befehle** `/lead` schreiben und den Link der Firmenwebsite einfügen (nur dort funktioniert der Befehl). Nur du siehst die Antwort des Bots. Firmen findet auch die **Lead-Suche** (eigene Anleitung unten).\n" +
  "2. Der Bot liest Startseite, Kontakt und Impressum und legt in **#leads** eine Karte an: Firma, Branche, Telefon, E-Mail, Ansprechpartner, Adresse, Zusammenfassung, was an der Website auffällt und welche unserer Leistungen passen könnte. Der Bot sendet und ruft nichts selbst.\n" +
  "3. **Abstimmung:** Jeder klickt **Passt** (grün) oder **Passt nicht** (rot). Die Karte zeigt „1 von 2“. Zwei gleiche Stimmen entscheiden. Die eigene Stimme lässt sich ändern, solange noch nicht entschieden ist.\n" +
  "4. **Zweimal „Passt nicht“:** Der Bot fragt nach. **Sicher ablehnen** löscht die Karte endgültig, **Abbrechen** nimmt die Ablehnung zurück. Eine so abgelehnte Firma wird nie wieder vorgelegt.\n" +
  "5. **Zweimal „Passt“:** Die Karte wird grün. Es erscheinen **Offen · In Arbeit · Kontaktiert · Kunde: Kein Interesse** und darunter **Übernehmen** und **Aussortieren**.\n\n" +
  "**Übernehmen und Freigeben**\n" +
  "• Wer bei dem Unternehmen anruft und den Lead aufbaut, drückt **Übernehmen**. Sein Name steht dann auf der Karte („Übernommen von“), so weiß jeder, wer dran ist.\n" +
  "• **Nur wer den Lead übernommen hat, kann die Knöpfe drücken** (Status, Lead aktiv, Kein Interesse, Aussortieren). David darf immer. Alle anderen bekommen eine private Meldung, und die Karte bleibt unverändert.\n" +
  "• **Freigeben** gibt den Lead wieder ab. Ist er frei, kann niemand die Status-Knöpfe drücken, bis ihn jemand von euch übernimmt.\n\n" +
  "**Die Knöpfe**\n" +
  "• **Kontaktiert** → dann erscheint **Lead aktiv**: legt die Firma automatisch in Notion bei den Kunden an (neue Kunden-ID, Daten aus der Karte). Der Kundenkanal knd_00X in Discord entsteht dann von selbst.\n" +
  "• **Aussortieren** (mit Rückfrage): Ihr nehmt die Firma im Moment doch nicht? Die Karte verschwindet, die Firma wird **nicht** gesperrt und lässt sich später mit `/lead` wieder anlegen.\n" +
  "• **Kunde: Kein Interesse** nur, wenn der **Kunde** absagt. Die Karte wandert nach **#lead-ablage** (nur lesbar).\n\n" +
  "**Karten aus der Lead-Suche** tragen oben „🔎 Aus der Lead-Suche“ und im Fuß „per Suche“. Sie laufen genauso weiter.\n\n" +
  "**Doppelte:** Wirft jemand dieselbe Firma noch einmal ein, verweist der Bot auf die bestehende Karte oder sagt, dass sie abgelehnt wurde.\n" +
  "**Löschen (nur David):** `/lead-delete` mit dem Link löscht eine Karte oder hebt eine Ablehnung auf.\n" +
  "**Hinweis:** Nur kontaktieren, wenn es rechtlich zulässig ist (Kaltakquise, UWG §7).";

const SUCHE =
  "**Wo:** Kanal **#lead-suche** (Kategorie Team). Der Bot findet Firmen über Google Maps, am liebsten solche ohne oder mit schlechter Website.\n\n" +
  "**1. Freischalten:** **Suche starten** drücken. Der Bot schickt dir einen **Code per Direktnachricht** (gilt einmal, 15 Minuten). Mit **Code eingeben** schaltest du dich **60 Minuten** frei, die Restzeit läuft oben mit. Wer in der Zeit wieder „Suche starten“ drückt, braucht keinen neuen Code. Die Suchzentrale verschwindet, wenn du Discord neu lädst.\n" +
  "**2. Einstellen:** Auswahlfelder für **Branchen** (bis zu 4), **Umkreis** (1 bis 50 km, die Karte zeigt den Kreis), **Website-Art** (ohne Website, nur Facebook & Co., schlechte Website, gute Website) und **Sortierung**. Mit **Ort & Filter** änderst du den Ort (Standard Mühlheim am Main), nennst eigene Branchen und stellst Mindestbewertung und Mindestanzahl der Bewertungen ein. **Nur neue Firmen** (standardmäßig an) blendet alles aus, was ihr schon gesehen oder bearbeitet habt.\n" +
  "**3. Suchen:** **Suche starten** legt einen **privaten Thread** an, den nur du siehst, mit bis zu **5 Karten** und einer Karte mit nummerierten Markern. Der Thread schließt sich nach einem Tag von selbst, oder du tippst `/close` im Thread.\n\n" +
  "**Auf jeder Karte:** Bewertung, Entfernung, Website, Öffnungszeiten (🟢 gerade geöffnet / 🔴 geschlossen) und die Knöpfe\n" +
  "• **Zur Abstimmung** → die Karte kommt als normale Abstimmungskarte nach #leads (mit @Team-Ping)\n" +
  "• **Später** → wird nach 30 Tagen wieder vorgeschlagen\n" +
  "• **Verwerfen** → wird bei „Nur neue Firmen“ nicht wieder gezeigt (mit **Zurücknehmen** rückgängig)\n" +
  "• **Notiz** → eine Zeile, die auf der Karte steht und nach #leads mitwandert\n" +
  "• **Karte** → öffnet die Firma in Google Maps\n\n" +
  "**📊 Woche:** zeigt je Woche, wie viele Treffer zur Abstimmung kamen, angenommen und zu aktiven Leads wurden.\n" +
  "**Limit:** 3 Suchen pro 24 Stunden für das ganze Team. Jede Suche wird 24 Stunden nach dem Start wieder frei (Timer in der Suchzentrale). Die Meldung „… hat gesucht“ im Kanal verschwindet nach 24 Stunden. Eine Suche kostet etwa 10 Cent.\n" +
  "**Hinweis:** Nur kontaktieren, wenn es rechtlich zulässig ist (Kaltakquise).";

const ANRUFE =
  "**Ablauf**\n" +
  "1. Jeder Anruf beim KI-Assistenten kommt als Karte in **#anrufe**: Anrufer, Betrieb, Rückrufnummer, Terminwunsch, Zusammenfassung, Dauer. Das Gespräch steht zusätzlich in der Mail.\n" +
  "2. **Übernehmen:** Wer sich kümmert, drückt Übernehmen. Sein Name steht als **Bearbeiter** auf der Karte.\n" +
  "3. **Nur der Bearbeiter** (und David) kann danach die Knöpfe benutzen. Alle anderen bekommen eine private Meldung.\n\n" +
  "**Die Knöpfe**\n" +
  "• **Termin bestätigen (SMS):** Der Kunde bekommt eine Bestätigung per SMS, der vorläufige Kalendereintrag wird angepasst.\n" +
  "• **Anderen Termin vorschlagen:** Ein kleines Fenster fragt Datum und Uhrzeit. Der Kunde bekommt eine SMS mit Link und bestätigt oder wünscht einen anderen Termin. Die Karte zeigt, wie es steht.\n" +
  "• **Erledigt:** schließt die Karte (z. B. wenn nur zurückgerufen wurde).\n" +
  "• **Freigeben:** gibt den Anruf wieder ab. Dann kann ein anderer **Übernehmen**. Der Stand (z. B. „Vorschlag gesendet“) bleibt erhalten.\n\n" +
  "**Erinnerungen:** Zu bestätigten Terminen kommen Erinnerungen in **#termine** (am Vortag und eine Stunde vorher), mit Erwähnung des Bearbeiters.";

const RUFGRUPPE =
  "**Wenn jemand beim KI-Assistenten einen Menschen verlangt**, klingeln **gleichzeitig** die Handys von David, Mijo und Jakob. Der Anruf kommt von **+49 6108 9694027** (bitte als Kontakt speichern, z. B. „Agents Gilt“).\n\n" +
  "**1. Abnehmen und die 1 drücken.** Wer abnimmt, hört „Anruf von Agents Gilt. Drücken Sie die 1“ und muss **die 1 drücken**, erst dann wird verbunden. So nimmt keine Mailbox und kein Anruffilter den Anruf an.\n" +
  "**2. Niemand nimmt an** (nach etwa 25 Sekunden): Der Anrufer hört eine Ansage („Im Moment ist leider niemand aus unserem Team erreichbar …“), und in **#anrufe** steht eine Meldung mit seiner Nummer. Bitte zurückrufen.\n\n" +
  "**Damit es klappt:**\n" +
  "• Die congstar-Mailbox ausschalten: in der Telefon-App `##002#` wählen und anrufen.\n" +
  "• iPhone: Einstellungen → Apps → Telefon → „Unbekannte Anrufer filtern“ auf **Nie**, und bei „Nicht stören“ eine Ausnahme für die Nummer.\n" +
  "• Durchgestellt wird derzeit zu jeder Zeit. Feste Zeiten legen wir fest, sobald ihr sie abgesprochen habt.";

const BEFEHLE =
  "• `/lead link: …` legt eine Lead-Karte an (nur in #lead-befehle)\n" +
  "• `/lead-delete link: …` löscht eine Karte oder hebt eine Ablehnung auf (nur David)\n" +
  "• `/close` schließt deinen Such-Thread der Lead-Suche vorzeitig (nur im eigenen Thread)";

const NEU: { titel: string; text: string }[] = [
  { titel: "📖 Anleitung: Lead-Suche (Firmen finden)", text: SUCHE },
  { titel: "📖 Anleitung: Anrufe (Karten in #anrufe)", text: ANRUFE },
  { titel: "📖 Anleitung: Telefon-Rufgruppe", text: RUFGRUPPE },
  { titel: "📖 Befehle", text: BEFEHLE },
];

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const kanal = await findChannelId(token, "willkommen");
  if (!kanal) return NextResponse.json({ error: "Kanal #willkommen fehlt" }, { status: 404 });

  const msgs = await listMessages(token, kanal, 50);
  const finde = (titel: string) => msgs.find((m) => m.author.bot && m.embeds?.[0]?.title?.startsWith(titel));
  const ergebnis: string[] = [];

  const lead = finde("📖 Anleitung: Lead-Karten");
  if (lead) {
    const e = lead.embeds[0] as EmbedLike;
    const ok = await call(token, "PATCH", `/channels/${kanal}/messages/${lead.id}`, { embeds: [{ ...e, description: LEADS }], allowed_mentions: { parse: [] } });
    ergebnis.push(`Lead-Karten: ${ok ? "aktualisiert" : "FEHLER"}`);
  } else ergebnis.push("Lead-Karten: nicht gefunden");

  const farbe = (lead?.embeds[0] as EmbedLike | undefined)?.color ?? 0xd4a23c;
  for (const n of NEU) {
    const da = finde(n.titel);
    const embed = { title: n.titel, description: n.text, color: farbe };
    if (da) {
      const ok = await call(token, "PATCH", `/channels/${kanal}/messages/${da.id}`, { embeds: [embed], allowed_mentions: { parse: [] } });
      ergebnis.push(`${n.titel}: ${ok ? "aktualisiert" : "FEHLER"}`);
    } else {
      const ok = await call(token, "POST", `/channels/${kanal}/messages`, { embeds: [embed], allowed_mentions: { parse: [] } });
      ergebnis.push(`${n.titel}: ${ok ? "neu" : "FEHLER"}`);
    }
  }
  return NextResponse.json({ ergebnis });
}
