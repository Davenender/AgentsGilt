import { NextResponse } from "next/server";
import {
  ANSAGE,
  absender,
  imZeitfenster,
  meldeInDiscord,
  schluesselOk,
  twilioSignaturOk,
  twimlAnnahme,
  twimlEingang,
  twimlEnde,
  twimlKlingeln,
  twimlWeiter,
  wirklichVerbunden,
} from "@/lib/rufgruppe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Twilio ruft diese Adresse für die Rufgruppe auf:
//   ?a=eingang  jeder neue Anruf auf +49 6108 9694027 (Voice-Adresse bei Twilio): an Vapi weiterreichen
//   ?a=weiter   wenn die Verbindung zum Assistenten zu Ende ist
//   ?a=ring     Anrufer wurde zum Team umgeleitet: die Handys klingeln
//   ?a=annahme  läuft auf dem Handy dessen, der abgenommen hat (Taste 1)
//   ?a=ende     wenn das Klingeln zu Ende ist
// Berechtigt ist, wer eine gültige Twilio-Signatur mitschickt (oder den Schlüssel in der
// Adresse kennt, siehe lib/rufgruppe.ts).

const twiml = (xml: string) => new NextResponse(xml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });

async function handle(request: Request) {
  const url = new URL(request.url);
  const aktion = url.searchParams.get("a");

  const form = request.method === "POST" ? await request.formData().catch(() => null) : null;
  const params: Record<string, string> = {};
  form?.forEach((v, k) => {
    params[k] = String(v);
  });
  const feld = (name: string) => params[name] ?? null;

  // Twilio signiert die Adresse so, wie sie bei Twilio hinterlegt ist.
  const site = process.env.SITE_URL || "https://agentsgilt.com";
  const signiert = twilioSignaturOk(`${site}${url.pathname}${url.search}`, params, request.headers.get("x-twilio-signature"));
  if (!signiert && !schluesselOk(url.searchParams.get("k"))) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }

  console.log(
    `[rufgruppe] ${aktion} von=${feld("From") ?? "-"} status=${feld("DialCallStatus") ?? feld("CallStatus") ?? "-"} dauer=${feld("DialCallDuration") ?? "-"}`,
  );

  if (aktion === "eingang") return twiml(twimlEingang());
  if (aktion === "weiter") {
    const status = feld("DialCallStatus");
    if (status && status !== "completed" && status !== "answered") {
      await meldeInDiscord(`⚠️ **Der KI-Assistent war nicht erreichbar** (Status ${status}). Der Anrufer${feld("From") ? ` (${feld("From")})` : ""} wurde direkt zum Team durchgestellt.`);
    }
    return twiml(twimlWeiter(status));
  }
  if (aktion === "ring") {
    if (!imZeitfenster()) {
      await meldeInDiscord("📵 **Ein Anrufer wollte einen Mitarbeiter**, aber gerade ist keine Zeit für das Durchstellen. Er hat die Ansage gehört. Bitte zurückrufen (Nummer in der Anrufkarte).");
      return twiml(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="de-DE" voice="Polly.Vicki">${ANSAGE}</Say><Hangup/></Response>`,
      );
    }
    return twiml(twimlKlingeln());
  }
  if (aktion === "annahme") return twiml(twimlAnnahme(feld("Digits")));
  if (aktion === "ende") {
    const status = feld("DialCallStatus");
    const dauer = Number(feld("DialCallDuration") ?? 0) || 0;
    const verbunden = wirklichVerbunden(status, dauer);
    if (!verbunden) {
      const grund =
        status === "no-answer"
          ? "Niemand hat abgenommen."
          : status === "canceled"
            ? "Der Anrufer hat vorher aufgelegt."
            : status === "completed" || status === "answered"
              ? "Ein Handy hat abgenommen (vermutlich Mailbox oder Anruffilter), aber niemand hat die 1 gedrückt."
              : `Technisches Problem (${status}).`;
      const nr = feld("From");
      const eigene = absender().replace("+", "");
      const anrufer = nr && !nr.replace("+", "").startsWith(eigene.slice(0, 6)) ? ` (${nr})` : "";
      await meldeInDiscord(
        `📵 **Durchstellen hat nicht geklappt:** Ein Anrufer${anrufer} wollte einen Mitarbeiter. ${grund} Bitte zurückrufen (Nummer in der Anrufkarte).`,
      );
    }
    return twiml(twimlEnde(verbunden));
  }
  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

export const GET = handle;
export const POST = handle;
