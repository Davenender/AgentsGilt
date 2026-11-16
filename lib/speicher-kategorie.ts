// Kategorie „🗄️ SPEICHER“ (16.11.2026, Davids Wunsch): Die Merkzettel-Kanäle des Bots liegen gesammelt ganz unten
// im Server, nur für David und den Bot sichtbar, zum Einklappen. Der Bot findet sie weiter über den Namen.
// #posteingang, #luca und #akademie-verwaltung bleiben, wo sie sind (David arbeitet damit).
// Reine Logik: tests/speicher-kategorie.test.ts. Einrichten: POST /api/speicher, neue Merkzettel: nurDavidKanal().

export const SPEICHER_KATEGORIE = "🗄️ SPEICHER";
export const SPEICHER_KANAELE = ["lead-speicher", "lead-suche-speicher", "akademie-speicher", "mail-faeden", "recherche-speicher", "team-register", "kunden-stand"] as const;

export const istSpeicher = (name: string) => (SPEICHER_KANAELE as readonly string[]).includes(name);

type KanalKurz = { id: string; name: string; type: number; position: number; parent_id?: string | null };

/** Welche Kanäle in die Kategorie müssen und welche Position sie braucht (null = steht schon ganz unten). */
export function speicherPlan(kanaele: KanalKurz[], katId: string): { verschieben: string[]; position: number | null } {
  const verschieben = kanaele.filter((c) => c.type === 0 && istSpeicher(c.name) && c.parent_id !== katId).map((c) => c.id);
  const kat = kanaele.find((c) => c.id === katId);
  const andere = Math.max(-1, ...kanaele.filter((c) => c.type === 4 && c.id !== katId).map((c) => c.position));
  return { verschieben, position: kat && kat.position > andere ? null : andere + 1 };
}
