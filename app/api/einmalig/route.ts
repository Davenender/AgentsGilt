import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { USAGE_TEXT } from "@/lib/leads";
import { findChannelId, postText } from "@/lib/discord";

export const runtime = "nodejs";

// TEMPORÄR: einmalige Einrichtung (Befehle anmelden, Anleitung posten). Danach löschen.
const KEY_HASH = "b09a86305fa9b9d789113f98cfc59a8c45fd04f475670452fd0c234f8eeb057e";
const GUILD = process.env.DISCORD_GUILD_ID || "1564355422222159975";
const API = "https://discord.com/api/v10";

const ANLEITUNG_1 = [
  "📖 **Anleitung: Support-Chat auf der Website**",
  "",
  "**Wie es abläuft**",
  "1. Ein Besucher klickt im Website-Chat auf „mit einem Mitarbeiter sprechen“, gibt Name, Kontakt und Anliegen an und schickt es ab.",
  "2. Im Bereich **SUPPORT** entsteht ein Kanal `ticket-000X` mit einer Karte (Name, Kontakt, Frage, bisheriger Chat) und einem @Team-Ping. Zusätzlich kommt eine E-Mail.",
  "3. Wer sich kümmert, klickt **Übernehmen**. Der Besucher sieht dann seinen Namen und „Du bist jetzt mit einem Mitarbeiter verbunden und kannst direkt schreiben.“",
  "4. Danach einfach **normal in den Kanal schreiben**. Der Besucher sieht die Nachricht im Chat mit eurem Namen (David, Jakob, Mijo). Rechtschreibung, Groß-/Kleinschreibung und Kommas glättet der Bot automatisch.",
  "5. Was der Besucher schreibt, erscheint im Kanal als „🗨️ Besucher: …“.",
  "",
  "**Gut zu wissen**",
  "• **Interne Notiz:** Nachricht mit `//` beginnen, dann sieht der Besucher sie nicht.",
  "• **Besucher weg:** Verlässt er die Seite, meldet der Bot das mit ❗. Meldet er sich wieder, steht dort ✅. Antworten kommen nur an, solange er im Chat ist, sonst über den Kontakt in der Karte melden.",
  "• **Schließen:** Mit **Ticket schließen** wird der Kanal zu `geschlossen-ticket-000X`, wandert in **ARCHIV** und ist nur noch lesbar.",
  "• Der KI-Chatbot nennt nie Preise und bietet bei Preisfragen, Wunsch nach einem Menschen oder Problemen den Mitarbeiter-Chat an.",
].join("\n");

const ANLEITUNG_2 = [
  "📖 **Anleitung: Lead-Karten (neue Unternehmen vorschlagen)**",
  "",
  "**Ablauf**",
  "1. In irgendeinem Kanal `/lead` schreiben und den Link der Firmenwebsite einfügen. Nur du siehst die Antwort des Bots.",
  "2. Der Bot liest Startseite, Kontakt und Impressum und legt in **#leads** eine Karte an: Firma, Branche, Telefon, E-Mail, Ansprechpartner, Adresse, Zusammenfassung, was an der Website auffällt und welche unserer Leistungen passen könnte. Der Bot sendet und ruft nichts selbst an.",
  "3. **Abstimmung:** Jeder klickt **Passt** (grün) oder **Passt nicht** (rot). Die Karte zeigt „1 von 2“. Zwei gleiche Stimmen entscheiden. Die eigene Stimme lässt sich ändern, solange noch nicht entschieden ist.",
  "4. **Zweimal „Passt nicht“:** Der Bot fragt nach. **Sicher ablehnen** löscht die Karte endgültig, **Abbrechen** nimmt die Ablehnungen zurück. Eine abgelehnte Firma wird nie wieder vorgelegt.",
  "5. **Zweimal „Passt“:** Die Karte wird grün, die Abstimmungsknöpfe verschwinden, und es erscheinen Status-Knöpfe: **Offen · In Arbeit · Kontaktiert · Kein Interesse**. Dafür braucht es keine zwei Stimmen.",
  "6. Nach **Kontaktiert** erscheint **Lead aktiv**. Der Klick legt die Firma automatisch in Notion bei den Kunden an (neue Kunden-ID, Daten aus der Karte). Der Kunden-Kanal knd_00X in Discord entsteht dann von selbst.",
  "7. **Kein Interesse** verschiebt die Karte nach **#lead-ablage**, nur lesbar.",
  "",
  "**Doppelte:** Wirft jemand dieselbe Firma noch einmal ein, verweist der Bot auf die bestehende Karte oder sagt, dass sie abgelehnt wurde.",
  "**Löschen (nur David):** `/lead-delete` mit dem Link löscht eine Karte oder hebt eine Ablehnung auf.",
  "**Hinweis:** Nur kontaktieren, wenn es rechtlich zulässig ist (Kaltakquise, UWG §7).",
].join("\n");

export async function POST(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  if (!timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"))) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Token fehlt" }, { status: 500 });
  const action = new URL(request.url).searchParams.get("action");
  const h = { "Content-Type": "application/json", Authorization: `Bot ${token}` };

  if (action === "commands") {
    const me = (await (await fetch(`${API}/oauth2/applications/@me`, { headers: h })).json()) as { id?: string };
    if (!me.id) return NextResponse.json({ error: "Anwendung nicht gefunden" }, { status: 502 });
    const option = { type: 3, name: "link", description: "Link zur Website des Unternehmens", required: true };
    const res = await fetch(`${API}/applications/${me.id}/guilds/${GUILD}/commands`, {
      method: "PUT",
      headers: h,
      body: JSON.stringify([
        { name: "lead", type: 1, description: "Ein Unternehmen als möglichen Lead vorschlagen", options: [option] },
        { name: "lead-delete", type: 1, description: "Lead-Karte löschen oder Ablehnung aufheben (nur David)", options: [option] },
      ]),
    });
    return NextResponse.json({ ok: res.ok, status: res.status, body: (await res.text()).slice(0, 300) });
  }

  if (action === "willkommen") {
    const ch = await findChannelId(token, "willkommen");
    if (!ch) return NextResponse.json({ error: "Kanal willkommen fehlt" }, { status: 404 });
    const a = await postText(token, ch, ANLEITUNG_1);
    const b = await postText(token, ch, ANLEITUNG_2);
    return NextResponse.json({ ok: a && b });
  }

  void USAGE_TEXT;
  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
