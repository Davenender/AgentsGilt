import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { buildEmbed, postWithBot } from "@/lib/discord";
import { callComponents, openEmbed } from "@/lib/discord-calls";
import { berlinNow, formatTermin, parseDatum } from "@/lib/termin";

export const runtime = "nodejs";

// TEMPORÄR: legt eine Test-Anrufmeldung mit Knöpfen an, ohne echten Anruf.
// Einmal-Schlüssel nur als SHA-256. Nach dem Test wieder löschen.
const KEY_HASH = "7f7f5fc17e6b2fe1797671adf74f1325d8696414fca86e7e8a1df5ef23c3539a";

function naechsterWerktag(): string {
  const heute = berlinNow();
  for (let i = 1; i < 8; i++) {
    const d = new Date(Date.UTC(heute.year, heute.month - 1, heute.day + i));
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    const datum = parseDatum(d.toISOString().slice(0, 10));
    if (datum) return formatTermin({ ...datum, hour: 14, minute: 0 });
  }
  return "";
}

export async function POST(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  if (!timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"))) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }
  const nummer = new URL(request.url).searchParams.get("nr") || "+49 173 7184452";
  const ok = await postWithBot(process.env.DISCORD_BOT_TOKEN, process.env.DISCORD_CHANNEL_ANRUFE, {
    embeds: [
      openEmbed(
        buildEmbed({
          title: "Neuer Anruf von +49 000 0000000 (Test)",
          description: "Testmeldung ohne echten Anruf, nur zum Ausprobieren der Knöpfe.",
          fields: [
            { name: "Anrufer", value: "Max Test", inline: true },
            { name: "Betrieb", value: "Test GmbH", inline: true },
            { name: "Rückrufnummer", value: nummer, inline: true },
            { name: "Terminwunsch", value: naechsterWerktag(), inline: true },
          ],
          footer: "Test · kein echter Anruf",
        }),
      ),
    ],
    components: callComponents("open"),
  });
  return NextResponse.json({ ok });
}
