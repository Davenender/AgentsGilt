// Welchen Discord-Kanal nehmen? Reine Logik, ohne Abhängigkeiten (genutzt von Akademie und Leads).
type KanalKurz = { id: string; name: string; type: number };
/**
 * Welchen Kanal nehmen (09.11.)? Ohne Kanalliste (Discord antwortet nicht) wird nie angelegt – sonst entstehen Doppelte.
 * Gibt es schon mehrere mit dem Namen, gilt wie bisher der erste in Discords Liste (dorthin hat der Bot immer geschrieben).
 */
export function kanalWahl(kanaele: readonly KanalKurz[] | null, name: string, typ: number, ohneGross = false): { art: "da"; id: string } | { art: "anlegen" } | { art: "unbekannt" } {
  if (!kanaele) return { art: "unbekannt" };
  const gleich = (a: string) => (ohneGross ? a.toLowerCase() === name.toLowerCase() : a === name);
  const treffer = kanaele.find((c) => c.type === typ && gleich(c.name));
  return treffer ? { art: "da", id: treffer.id } : { art: "anlegen" };
}
