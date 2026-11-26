// 26.11.2026: Bremst Discord (429), warten wir die Zeit ab, die Discord nennt (höchstens 4 s), und versuchen es bis zu
// dreimal. Vorher gab der Standort-Eingang nach einem Versuch auf (503) – Davids iPhone hielt dann alles Weitere zurück.
export async function mitWarten(
  mach: () => Promise<Response>,
  o: { versuche?: number; warte?: (ms: number) => Promise<void> } = {},
): Promise<Response> {
  const versuche = o.versuche ?? 3;
  const warte = o.warte ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let res = await mach();
  for (let i = 1; i < versuche && res.status === 429; i++) {
    const sek = Number(((await res.clone().json().catch(() => ({}))) as { retry_after?: number }).retry_after) || 1;
    await warte(Math.min(4, Math.max(0.05, sek)) * 1000 + 100);
    res = await mach();
  }
  return res;
}
