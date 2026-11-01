import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// Die Zeitplan-Adressen (cron-job.org) brauchen kein Geheimnis, weil sie nur Fälliges erledigen.
// Damit niemand sie im Sekundentakt aufruft und so die Discord- oder Google-Grenzen ausreizt, gibt es pro Adresse
// höchstens 6 Aufrufe pro Minute (pro Server-Instanz). Der normale Takt liegt weit darunter.
export function zeitplanGebremst(name: string): NextResponse | null {
  const rl = rateLimit(`zeitplan:${name}`, 6, 60_000);
  return rl.ok ? null : NextResponse.json({ error: "Zu viele Aufrufe" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
}
