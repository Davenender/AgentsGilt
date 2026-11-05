import { after, NextResponse } from "next/server";
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
  twimlRueckrufAnsage,
  wartAufEnde,
  twimlWeiter,
  wirklichVerbunden,
  adresseLucaEnde,
  angenommenVon,
  teamName,
  twimlDavidsMenue,
} from "@/lib/rufgruppe";
import { berlinUhr, DURCHGESTELLT_FELD, durchgestelltText, istDavid, menuewahl, twimlLucaNichtDa, twimlZuLuca } from "@/lib/luca-logik";
import { davidsNummern, lucaAn, lucaSip, sipZugang } from "@/lib/luca";
import { setzeKartenzeile } from "@/lib/anruf-karte";

import { markiereZurueckgerufen, rueckrufNachEigenemAnruf, rueckrufWartet } from "@/lib/rueckruf";
import { rueckrufKonfiguriert } from "@/lib/discord-calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Nach der Ansage wartet der Server, bis der Kunde aufgelegt hat, und startet dann den Rückruf.
export const maxDuration = 120;

// Twilio ruft diese Adresse für die Rufgruppe auf:
//   ?a=eingang  jeder neue Anruf auf +49 6108 9694027 (Voice-Adresse bei Twilio): an Vapi weiterreichen.
//               Wartet für die Nummer des Anrufers ein geplanter Wiederholungs-Rückruf, hört er stattdessen eine Ansage
//               (?a=wartet), legt auf, und der Rückruf-Assistent ruft ihn sofort an.
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

  if (aktion === "eingang") {
    const von = feld("From");
    // David (LUCA_NUMMER oder DAVID_NUMMERN) bekommt ein Menü: 1 = Luca, 2 = Kunden-Assistent. Alle anderen merken davon nichts.
    if (lucaAn() && istDavid(von, davidsNummern())) return twiml(twimlDavidsMenue(1));
    // Hat unser Rückruf-Assistent den Kunden nicht erreicht und er ruft jetzt zurück? Dann nicht zum normalen Assistenten.
    const sid = feld("CallSid");
    if (von && sid && rueckrufKonfiguriert()) {
      try {
        const wartet = await Promise.race([rueckrufWartet(von), new Promise<null>((r) => setTimeout(() => r(null), 5000))]);
        if (wartet) {
          console.log(`[rufgruppe] Rückruf wartet auf ${von}: Ansage, danach Rückruf durch den Assistenten`);
          await markiereZurueckgerufen(wartet.messageId, wartet.embed, wartet.versuch);
          after(async () => {
            await wartAufEnde(sid, 100);
            await new Promise((r) => setTimeout(r, 2000));
            await rueckrufNachEigenemAnruf(wartet.messageId, wartet.versuch, von);
          });
          return twiml(twimlRueckrufAnsage(1));
        }
      } catch (err) {
        console.error("[rufgruppe] Prüfung auf wartenden Rückruf fehlgeschlagen, Anruf geht normal weiter:", err);
      }
    }
    return twiml(twimlEingang());
  }
  if (aktion === "menue") {
    if (!lucaAn() || !istDavid(feld("From"), davidsNummern())) return twiml(twimlEingang());
    const runde = Math.max(1, Math.min(99, Number(url.searchParams.get("n")) || 1));
    const taste = feld("Digits");
    if (taste === null) return twiml(twimlDavidsMenue(runde)); // keine Taste: Ansage noch einmal
    const wahl = menuewahl(taste);
    const sip = lucaSip();
    const zugang = sipZugang();
    if (wahl === "luca" && sip && zugang) return twiml(twimlZuLuca(sip, zugang, adresseLucaEnde()));
    if (wahl === "kunde") return twiml(twimlEingang());
    return twiml(twimlDavidsMenue(runde + 1));
  }
  if (aktion === "lucaende") {
    const status = feld("DialCallStatus");
    if (status && status !== "completed" && status !== "answered") {
      console.error(`[rufgruppe] Luca nicht erreichbar: ${status}`);
      return twiml(twimlLucaNichtDa());
    }
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
  if (aktion === "wartet") {
    const n = Math.max(1, Math.min(9, Number(url.searchParams.get("n")) || 1));
    return twiml(twimlRueckrufAnsage(n));
  }
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
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="de-DE" voice="Polly.Vicki-Generative">${ANSAGE}</Say><Hangup/></Response>`,
      );
    }
    return twiml(twimlKlingeln());
  }
  if (aktion === "annahme") return twiml(twimlAnnahme(feld("Digits")));
  if (aktion === "ende") {
    const status = feld("DialCallStatus");
    const dauer = Number(feld("DialCallDuration") ?? 0) || 0;
    const verbunden = wirklichVerbunden(status, dauer);
    // Kurze Zeile auf der Karte des Anrufers: wer angenommen hat (oder dass es nicht geklappt hat).
    const anrufer = feld("From");
    const dialSid = feld("DialCallSid");
    if (anrufer) {
      after(async () => {
        const wer = verbunden ? teamName(await angenommenVon(dialSid)) : null;
        const zeile = durchgestelltText({
          verbunden,
          wer,
          sekunden: dauer,
          uhr: berlinUhr(new Date()),
          grund: status === "canceled" ? "der Anrufer hat vorher aufgelegt" : "niemand hat abgenommen",
        });
        // Die Karte entsteht mit dem Bericht des Assistenten – bei sehr kurzen Gesprächen ist sie evtl. noch nicht da.
        for (let versuch = 0; versuch < 4; versuch++) {
          if (await setzeKartenzeile(anrufer, DURCHGESTELLT_FELD, zeile).catch(() => false)) return;
          await new Promise((r) => setTimeout(r, 10_000));
        }
        console.error("[rufgruppe] Kartenzeile „Durchgestellt“: keine offene Karte gefunden");
      });
    }
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
