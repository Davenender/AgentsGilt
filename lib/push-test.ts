import { timingSafeEqual } from "node:crypto";

// Test-Push an das Team (19.11.2026): prüft nach einem neuen ntfy-Code, ob die Pushs ankommen.
// Nur mit HELFER_SECRET. Die Antwort nennt nur die Länge des Codes, nie den Code selbst. Tests: tests/push-test.test.ts.

type Schicke = (titel: string, text: string) => Promise<{ gesetzt: boolean; laenge: number; status: number | null }>;

export async function testPush(auth: string | null, geheim: string | undefined, schicke: Schicke) {
  const soll = Buffer.from(geheim?.trim() ?? "");
  const ist = Buffer.from((auth ?? "").replace(/^Bearer\s+/i, "").trim());
  if (!soll.length || ist.length !== soll.length || !timingSafeEqual(ist, soll)) return { status: 401, body: { fehler: "nicht erlaubt" } };
  const r = await schicke("🔔 Test-Push", "Wenn du das siehst, ist die ntfy-App richtig eingerichtet.");
  return { status: 200, body: { gesendet: r.gesetzt && r.status === 200, laenge: r.laenge, ntfy: r.status } };
}
