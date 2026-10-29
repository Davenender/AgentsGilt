import { NextResponse } from "next/server";
import { meldeInDiscord, schluesselOk, twimlAnnahme, twimlEnde, twimlKlingeln } from "@/lib/rufgruppe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Twilio ruft diese Adresse für die Rufgruppe auf (Klingeln, Annahme per Taste 1, Ende).
// Die Adressen enthalten einen Schlüssel, siehe lib/rufgruppe.ts.

const twiml = (xml: string) => new NextResponse(xml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });

async function handle(request: Request) {
  const url = new URL(request.url);
  if (!schluesselOk(url.searchParams.get("k"))) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }
  const form = request.method === "POST" ? await request.formData().catch(() => null) : null;
  const feld = (name: string) => (form?.get(name) ? String(form.get(name)) : null);
  const aktion = url.searchParams.get("a");

  if (aktion === "ring") return twiml(twimlKlingeln());
  if (aktion === "annahme") return twiml(twimlAnnahme(feld("Digits")));
  if (aktion === "ende") {
    const status = feld("DialCallStatus");
    if (status && status !== "completed" && status !== "answered") {
      const anrufer = feld("From") ?? "unbekannt";
      await meldeInDiscord(
        `📵 **Durchstellen hat nicht geklappt:** ${anrufer} wollte einen Mitarbeiter, aber niemand hat abgenommen (${status}). Der Anrufer hat die Ansage gehört. Bitte zurückrufen.`,
      );
    }
    return twiml(twimlEnde(status));
  }
  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

export const GET = handle;
export const POST = handle;
