// Mail-Fäden (Etappe 2, 16.11.2026): Schreibt das Team einem Kunden aus Discord eine Mail, merkt sich der Bot,
// wohin eine Antwort von dieser Adresse gehört (Ticket, Anfrage, Kundenkanal). Gilt 30 Tage.
// Reine Logik: tests/mail-faeden.test.ts. Gespeichert wird im Kanal „mail-faeden“ (lib/mail-faeden-speicher.ts).
import type { MailOrt } from "./mail-antwort.ts";

export interface Faden {
  email: string;
  kanal: string;
  ort: MailOrt;
  quelleId: string;
  /** Wann die Mail rausging (ISO). */
  zeit: string;
}

export const FADEN_TAGE = 30;
const TAG = 24 * 60 * 60 * 1000;
const norm = (s: string) => s.trim().toLowerCase();

export const fadenZeile = (f: Faden) => JSON.stringify({ ...f, email: norm(f.email) });

export function leseFaeden(zeilen: string[]): Faden[] {
  const liste: Faden[] = [];
  for (const z of zeilen) {
    try {
      const f = JSON.parse(z) as Partial<Faden>;
      if (f && typeof f.email === "string" && typeof f.kanal === "string" && typeof f.zeit === "string" && typeof f.ort === "string") {
        liste.push({ email: f.email, kanal: f.kanal, ort: f.ort as MailOrt, quelleId: String(f.quelleId ?? ""), zeit: f.zeit });
      }
    } catch {
      /* keine Faden-Zeile */
    }
  }
  return liste;
}

/** Der neueste Faden zu dieser Adresse, höchstens 30 Tage alt. */
export function waehleFaden(liste: Faden[], email: string, jetzt: number): Faden | null {
  const e = norm(email);
  let best: Faden | null = null;
  for (const f of liste) {
    const t = Date.parse(f.zeit);
    if (norm(f.email) !== e || Number.isNaN(t) || jetzt - t > FADEN_TAGE * TAG) continue;
    if (!best || t > Date.parse(best.zeit)) best = f;
  }
  return best;
}
