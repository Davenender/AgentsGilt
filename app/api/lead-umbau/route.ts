import { NextResponse } from "next/server";
import { findChannelId } from "@/lib/discord";
import { alleNachrichten, CH_ABLAGE, CH_SPEICHER, loescheNachricht, merkeAbgelehnt, ruesteKnoepfeNach, SEP } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmalig: (1) verschiebt alles aus #lead-ablage in den Merkzettel #lead-speicher (zählt als aussortiert, nicht als
// "Kein Interesse"), (2) rüstet angenommene Karten in #leads mit dem Knopf "Aussortieren" nach. Danach entfernen.
export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });

  const ablage = await findChannelId(token, CH_ABLAGE);
  const speicher = await findChannelId(token, CH_SPEICHER);
  const schonDa = new Set<string>();
  if (speicher) for (const m of await alleNachrichten(token, speicher, 300)) schonDa.add(m.content.split(SEP)[1] ?? "");

  const verschoben: string[] = [];
  if (ablage) {
    for (const m of await alleNachrichten(token, ablage, 300)) {
      const e = m.embeds?.[0];
      const f = e?.footer?.text;
      if (!m.author.bot || !e || !f?.startsWith("lead:")) continue;
      const domain = f.slice(5).split(SEP)[0].trim();
      if (domain && !schonDa.has(domain)) {
        await merkeAbgelehnt(token, domain, e.title ?? domain);
        schonDa.add(domain);
      }
      if (await loescheNachricht(token, ablage, m.id)) verschoben.push(e.title ?? domain);
    }
  }
  const knoepfe = await ruesteKnoepfeNach(token);
  return NextResponse.json({ verschoben, knoepfe });
}
