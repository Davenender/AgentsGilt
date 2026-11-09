// Lead-Abstimmung: wie viele gleiche Stimmen entscheiden (09.11.: ein „Passt“ reicht fürs Erste, Ablehnen braucht zwei).
export const NOETIG = { ja: 1, nein: 2 } as const;

export function entscheide(ja: number, nein: number): "accepted" | "confirm" | "vote" {
  if (ja >= NOETIG.ja) return "accepted";
  if (nein >= NOETIG.nein) return "confirm";
  return "vote";
}
