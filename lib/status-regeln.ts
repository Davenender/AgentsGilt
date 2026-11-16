// Status von selbst (Etappe 5, 16.11.2026, Davids Wunsch): nur aus festen Belegen, nur vorwärts, ohne KI.
//   🟡 Angebot gesendet: „Angebot raus“ ist abgehakt (auch von selbst, wenn eine freigegebene Mail den Angebotslink enthält)
//   🟢 Kunde: Zahlung über Stripe oder „Anzahlung erhalten“ (z. B. Überweisung)
//   🟢 Retainer läuft: bezahltes Monatsabo über Stripe
//   ⚪ Verloren: nur per Knopf, wird hier nie gesetzt und nie verlassen
// Reine Logik ohne Netz: tests/status-regeln.test.ts. Angewendet in app/api/notion/route.ts (Webhook),
// lib/stripe-meldung.ts (Zahlung), app/api/kunden/abgleich/route.ts (stündlich, Sicherheitsnetz).

export const STUFEN = ["Lead", "Angebot gesendet", "Kunde", "Retainer läuft"] as const;

export type Belege = { status: string; angebotRaus: boolean; anzahlung: boolean; bezahlt: boolean; abo: boolean };

/** Der neue Status, wenn die Belege weiter tragen als der jetzige. null = nichts ändern (auch bei „Verloren“ und Unbekanntem). */
export function statusAusBelegen(b: Belege): string | null {
  const jetzt = STUFEN.indexOf(b.status as (typeof STUFEN)[number]);
  if (jetzt === -1) return null;
  const ziel = b.abo ? 3 : b.bezahlt || b.anzahlung ? 2 : b.angebotRaus ? 1 : 0;
  return ziel > jetzt ? STUFEN[ziel] : null;
}

/** Belege aus den Notion-Feldern. Ein Abo kennt nur Stripe, darum hier nie. */
export function belege(w: { status: string; angebotRaus: boolean; anzahlungHaken: boolean; zahlungsstatus: string }): Belege {
  return {
    status: w.status,
    angebotRaus: w.angebotRaus,
    anzahlung: w.anzahlungHaken || w.zahlungsstatus === "Anzahlung erhalten",
    bezahlt: w.zahlungsstatus === "Bezahlt",
    abo: false,
  };
}

const GRUND: Record<string, string> = {
  "Angebot gesendet": "„Angebot raus“ ist abgehakt",
  Kunde: "Zahlung oder Anzahlung ist da",
  "Retainer läuft": "das Monatsabo ist bezahlt",
};

/** Zeile im Kundenkanal, wenn der Bot den Status gesetzt hat. */
export const statusZeile = (neu: string) => `${neu === "Angebot gesendet" ? "🟡" : "🟢"} Status von selbst auf **${neu}**: ${GRUND[neu] ?? "fester Beleg"}.`;

const ohneVorsatz = (s: string) =>
  s
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/(^|[\s(<"'])www\./g, "$1");

/** Steht der Angebotslink in der Mail? Ohne Rücksicht auf https, www, Groß-/Kleinschreibung und Schrägstrich am Ende. */
export function enthaeltLink(text: string, link: string | null | undefined): boolean {
  const l = ohneVorsatz((link ?? "").trim()).replace(/\/+$/, "");
  if (!/\w\.\w/.test(l)) return false;
  const t = ohneVorsatz(text);
  for (let i = t.indexOf(l); i !== -1; i = t.indexOf(l, i + 1)) {
    if (!/[a-z0-9_-]/.test(t[i + l.length] ?? "")) return true;
  }
  return false;
}
