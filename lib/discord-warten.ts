// 26.11.2026: Bremst Discord (429), warten wir die Zeit ab, die Discord nennt (höchstens 4 s), und versuchen es bis zu
// dreimal. Vorher gab der Standort-Eingang nach einem Versuch auf (503) – Davids iPhone hielt dann alles Weitere zurück.
export async function mitWarten(
  mach: () => Promise<Response>,
  o: { versuche?: number; warte?: (ms: number) => Promise<void>; /** 28.11.: bis dahin muss alles fertig sein (Vercel bricht nach 30 s ab) – sonst nicht mehr warten */ bis?: number; jetzt?: () => number } = {},
): Promise<Response> {
  const versuche = o.versuche ?? 3;
  const warte = o.warte ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const jetzt = o.jetzt ?? Date.now;
  let res = await mach();
  for (let i = 1; i < versuche && res.status === 429; i++) {
    const sek = Number(((await res.clone().json().catch(() => ({}))) as { retry_after?: number }).retry_after) || 1;
    const ms = Math.min(4, Math.max(0.05, sek)) * 1000 + 100;
    if (o.bis !== undefined && jetzt() + ms + 1000 > o.bis) break;
    await warte(ms);
    res = await mach();
  }
  return res;
}
