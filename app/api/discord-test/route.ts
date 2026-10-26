import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { buildEmbed, postWithBot } from "@/lib/discord";
import { callComponents, openEmbed } from "@/lib/discord-calls";

export const runtime = "nodejs";

// TEMPORÄR: löst eine Test-Anrufmeldung mit Knöpfen aus, ohne echten Anruf.
// Geschützt durch einen Einmal-Schlüssel (hier nur als SHA-256). Nach dem Test
// wieder löschen.
const KEY_HASH = "ca6c5a7607ef4e8b791d76d386a474d848abbd7ad185a95d0c621c572d722cef";

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
              { name: "Terminwunsch", value: "Morgen, 10:00 Uhr", inline: true },
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
