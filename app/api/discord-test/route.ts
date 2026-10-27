import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { buildEmbed, postWithBot } from "@/lib/discord";
import { callComponents, openEmbed } from "@/lib/discord-calls";
import { berlinNow, formatTermin, parseDatum } from "@/lib/termin";

export const runtime = "nodejs";

// TEMPORÄR: löst eine Test-Anrufmeldung mit Knöpfen aus, ohne echten Anruf.
// Geschützt durch einen Einmal-Schlüssel (hier nur als SHA-256). Nach dem Test
// wieder löschen.
const KEY_HASH = "ca6c5a7607ef4e8b791d76d386a474d848abbd7ad185a95d0c621c572d722cef";

// Nächster Werktag, 14:00 Uhr, im gleichen Format wie echte Anrufe.
function naechsterWerktag(): string {
  const heute = berlinNow();
  for (let i = 1; i < 8; i++) {
    const d = new Date(Date.UTC(heute.year, heute.month - 1, heute.day + i));
    const wd = d.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    const datum = parseDatum(d.toISOString().slice(0, 10));
    if (datum) return formatTermin({ ...datum, hour: 14, minute: 0 });
  }
  return "";
}

export async function POST(request: Request) {
  const given = createHash("sha256")
    .update(request.headers.get("x-test-key") ?? "")
    .digest();
  if (!timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"))) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }

  const ok = await postWithBot(
    process.env.DISCORD_BOT_TOKEN,
    process.env.DISCORD_CHANNEL_ANRUFE,
    {
      embeds: [
        openEmbed(
          buildEmbed({
            title: "Neuer Anruf von +49 000 0000000 (Test)",
            description:
              "Testmeldung ohne echten Anruf, nur zum Ausprobieren der Knöpfe.",
            fields: [
              { name: "Anrufer", value: "Max Test", inline: true },
              { name: "Betrieb", value: "Test GmbH", inline: true },
              // Test-SMS gehen an Davids Handynummer (steht auch auf der Website).
              { name: "Rückrufnummer", value: "+49 160 98427943", inline: true },
              {
                name: "Terminwunsch",
                value: new URL(request.url).searchParams.get("wunsch") || naechsterWerktag(),
                inline: true,
              },
            ],
            footer: "Test · kein echter Anruf",
          }),
        ),
      ],
      components: callComponents("open"),
    },
  );
  return NextResponse.json({ ok });
}
