import { NextResponse } from "next/server";
import { stripeDienste } from "@/lib/stripe-handler";
import { meldungAus, signaturGueltig, verarbeite } from "@/lib/stripe-meldung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Stripe ruft diese Adresse bei Zahlungen auf (Webhook). Eingetragene Ereignisse: invoice.paid, invoice.payment_failed,
// checkout.session.completed, customer.subscription.deleted. Die Signatur ist die Zugangsprüfung.
//
// Env-Vars (Vercel, Production):
//   STRIPE_WEBHOOK_SECRET  Signaturgeheimnis des Webhooks aus dem Stripe-Dashboard
//   DISCORD_BOT_TOKEN, NOTION_TOKEN  wie bei den anderen Brücken
export async function POST(request: Request) {
  const geheimnis = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!geheimnis || !token) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET oder DISCORD_BOT_TOKEN fehlt");
    return NextResponse.json({ error: "Nicht konfiguriert" }, { status: 500 });
  }

  // Die Signatur gilt für den unveränderten Text, darum erst danach auslesen.
  const roh = await request.text();
  if (!signaturGueltig(roh, request.headers.get("stripe-signature"), geheimnis)) {
    return NextResponse.json({ error: "Signatur ungültig" }, { status: 400 });
  }

  let ereignis: unknown;
  try {
    ereignis = JSON.parse(roh);
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const meldung = meldungAus(ereignis);
  if (!meldung) return NextResponse.json({ ok: true, gemeldet: false });

  // Bei einem Fehler antwortet die Adresse mit 500, dann schickt Stripe das Ereignis später noch einmal.
  const ok = await verarbeite(meldung, stripeDienste(token));
  return NextResponse.json({ ok, gemeldet: ok }, { status: ok ? 200 : 500 });
}
