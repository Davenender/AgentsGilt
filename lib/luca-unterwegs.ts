// Wo David ist und wie er wohin kommt – direkt von hier aus, ohne den Mac, damit Luca es im Anruf sofort sagen kann.
// Freie Dienste ohne Konto: Nominatim/Photon (Orte), routing.openstreetmap.de (Route), Transitous (Bus und Bahn), Open-Meteo.

const UA = "AgentsGilt-Luca/1.0 (privat)";
type Abruf = typeof fetch;

/** „Bahnhofstraße, Offenbach am Main“ aus Koordinaten; null, wenn der Dienst nicht antwortet. */
export async function ortsname(lat: number, lon: number, abruf: Abruf = fetch): Promise<string | null> {
  try {
    const res = await abruf(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=17&addressdetails=1&accept-language=de`, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const a = ((await res.json()) as { address?: Record<string, string> }).address ?? {};
    const teile = [a.road ?? a.pedestrian ?? a.footway ?? a.neighbourhood, a.city ?? a.town ?? a.village ?? a.municipality ?? a.suburb].filter(Boolean);
    return teile.length ? teile.join(", ") : null;
  } catch {
    return null;
  }
}
