// Welchen Discord-Kanal nehmen? Reine Logik, ohne Abhängigkeiten (genutzt von Akademie und Leads).
type KanalKurz = { id: string; name: string; type: number };
/**
 * Welchen Kanal nehmen (09.11.)? Ohne Kanalliste (Discord antwortet nicht) wird nie angelegt – sonst entstehen Doppelte.
 * Gibt es schon mehrere mit dem Namen, gilt der älteste (kleinste ID): Dort steht der bisherige Inhalt.
 */
export function kanalWahl(kanaele: readonly KanalKurz[] | null, name: string, typ: number, ohneGross = false): { art: "da"; id: string } | { art: "anlegen" } | { art: "unbekannt" } {
  if (!kanaele) return { art: "unbekannt" };
  const gleich = (a: string) => (ohneGross ? a.toLowerCase() === name.toLowerCase() : a === name);
  const treffer = kanaele.filter((c) => c.type === typ && gleich(c.name)).sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  return treffer[0] ? { art: "da", id: treffer[0].id } : { art: "anlegen" };
}
