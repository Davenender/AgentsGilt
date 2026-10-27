import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findChannelId, postEmbed } from "@/lib/discord";

export const runtime = "nodejs";

// TEMPORÄR: schreibt die Willkommens-Anleitung als Bot in #willkommen.
// Geschützt durch einen Einmal-Schlüssel (nur als SHA-256 hier). Danach löschen.
const KEY_HASH = "fad7a24839822c67edc0d6088846d8669dcea77f70039bd15b7a3d7040e08cca";

const GOLD = 0xd4a23c;

const NACHRICHTEN = [
  {
    title: "Willkommen bei Agents Gilt",
    color: GOLD,
    description:
      "Dieser Server ist unsere Schaltzentrale: Hier landen Anrufe, Termine und Kundeninfos, und vieles läuft automatisch über unseren Bot **Agents Gilt**.\n\n" +
      "Unten steht, welcher Kanal wofür da ist und wie alles zusammenspielt. Wer neu ist, liest einmal in Ruhe durch.",
  },
  {
    title: "Die wichtigsten Kanäle",
    color: GOLD,
    fields: [
      {
        name: "📞 #anrufe",
        value:
          "Jeder Anruf beim Telefonassistenten erscheint hier als Meldung: Name, Betrieb, Rückrufnummer, Terminwunsch und eine kurze Zusammenfassung. Mit den Knöpfen unter der Meldung bearbeitet ihr den Anruf (siehe unten). Dort wird nicht geschrieben, nur geklickt.",
      },
      {
        name: "📅 #termine",
        value:
          "Der Bot erinnert hier **einen Tag** und **eine Stunde** vor jedem bestätigten Kundentermin und markiert die Person, die den Anruf übernommen hat.",
      },
      {
        name: "👥 Kunden (knd_001, knd_002 …)",
        value:
          "Pro Kunde ein eigener Kanal, automatisch aus Notion. Oben steht die **Kundenkarte** mit Status, Angebot, Zuständigkeit, Gesamtzeit, Zahlungsstatus, Kontakt, nächstem Termin, nächstem Schritt, Preisen und Checkliste. Ändert sich in Notion etwas, wird die Karte aktualisiert, und darunter steht eine kurze Zeile, was sich geändert hat. Geregelt wird alles in Notion, hier liest man nur mit.",
      },
      {
        name: "🗂️ #notion",
        value: "Protokoll: Hier steht jedes Mal kurz, wenn eine Meldung aus Notion angekommen ist und was der Bot daraus gemacht hat.",
      },
      {
        name: "💶 #zahlungen",
        value: "Für Zahlungsmeldungen (zum Beispiel aus Stripe). Das ist noch nicht automatisiert und kommt später.",
      },
      {
        name: "💬 Team: #allgemein, #aufgaben, #ideen",
        value: "Der normale Team-Chat. In #aufgaben sollen später die Aufgaben aus Notion automatisch erscheinen.",
      },
      {
        name: "🎧 Sprachkanäle",
        value: "Team-Call, Fokus (ruhiges Arbeiten) und Kundengespräch.",
      },
    ],
  },
  {
    title: "So läuft ein Anruf",
    color: GOLD,
    description:
      "**1. Anruf kommt rein.** Der Telefonassistent nimmt an, fragt Name, Betrieb, Anliegen und Wunschtermin und trägt den Termin als \"VORLÄUFIG\" in den Kalender ein. Der Kunde hört: Der Termin ist vorgemerkt, eine SMS folgt.\n\n" +
      "**2. Meldung in #anrufe.** Wer den Anruf bearbeitet, klickt **Übernehmen** (Meldung wird blau, der Name steht als Bearbeiter dabei).\n\n" +
      "**3. Termin passt:** **Termin bestätigen (SMS)**. Der Kunde bekommt eine SMS, der Kalendereintrag verliert das \"VORLÄUFIG\", und die Meldung wird grün.\n\n" +
      "**4. Termin passt nicht:** **Anderen Termin vorschlagen**, Datum und Uhrzeit eintragen (werktags 9 bis 17 Uhr). Der Kunde bekommt eine SMS mit dem Vorschlag und einem Link. Dort sagt er \"Passt\" oder wählt eine andere Zeit. Seine Antwort erscheint in der Meldung (violett), und ihr könnt bestätigen oder neu vorschlagen. Ist die Zeit im Kalender schon belegt, geht keine SMS raus.\n\n" +
      "**5. Nur Rückruf, kein Termin:** Klickt nach dem Zurückrufen auf **Erledigt**.\n\n" +
      "**6. Vor dem Termin:** Der Bot erinnert in #termine.\n\n" +
      "Farben: 🟡 offen, 🔵 übernommen, 🟠 wartet auf den Kunden, 🟣 Kunde wünscht anderen Termin, 🟢 Termin steht, ⚪ erledigt.",
  },
  {
    title: "Notion und Kundenkanäle",
    color: GOLD,
    description:
      "Die Kundendatenbank in Notion ist die Quelle für alles. **Neue Zeile in Notion = neuer Kundenkanal** (knd_003, knd_004 …) mit Kundenkarte. **Änderung in Notion = Karte und Meldung im Kanal.** Die Beispiel-Zeile in Notion wird absichtlich ausgelassen.\n\n" +
      "Deshalb: Kundendaten **immer in Notion** pflegen, nicht hier.",
  },
  {
    title: "Gut zu wissen",
    color: GOLD,
    description:
      "• In den Kanälen von #anrufe, #termine, #zahlungen, #notion und bei den Kunden wird nicht geschrieben. Dort arbeiten die Knöpfe und der Bot.\n" +
      "• Den Bot nicht einladen, ändern oder entfernen. Er gehört zur Rolle **Agents Gilt**.\n" +
      "• Kundendaten sind vertraulich: nichts davon weitergeben oder außerhalb des Teams posten.\n" +
      "• Fragen oder etwas Kaputtes? In #allgemein schreiben.",
  },
];

export async function POST(request: Request) {
  const given = createHash("sha256")
    .update(request.headers.get("x-key") ?? "")
    .digest();
  if (!timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"))) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }
  const token = process.env.DISCORD_BOT_TOKEN;
  const kanal = await findChannelId(token, "willkommen");
  if (!kanal) return NextResponse.json({ error: "Kanal nicht gefunden" }, { status: 404 });

  const ids: (string | null)[] = [];
  for (const n of NACHRICHTEN) ids.push(await postEmbed(token, kanal, n));
  return NextResponse.json({ ok: ids.every(Boolean), nachrichten: ids.length });
}
