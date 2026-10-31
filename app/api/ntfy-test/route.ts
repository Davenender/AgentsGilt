import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { pushe } from "@/lib/ntfy";

export const runtime = "nodejs";

// TEMPORÄR: schickt einen Test-Push und sagt, ob NTFY_TOPIC gesetzt ist (nie den Wert selbst).
// Einmal-Schlüssel nur als SHA-256. Nach dem Test wieder löschen.
const KEY_HASH = "5bbbb3a5505d48dc22bc33e4847a35caad443ed9675c41be76040a5996047365";

export async function POST(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  if (!timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"))) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }
  const res = await pushe("🔔 Test von Agents Gilt", "Wenn du das liest, kommen die Pushes an.");
  return NextResponse.json(res);
}
