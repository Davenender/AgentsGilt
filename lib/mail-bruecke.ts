// Die Brücke zu Gmail: ein Google-Skript im Google-Konto (Apps Script) liest neue Mails und schickt sie an
// /api/mail/eingang. Umgekehrt ruft dieser Server das Skript, um eine Mail zu archivieren oder ihr ein Label
// zu geben ("Kunde 004"). Beide Richtungen sind durch ein gemeinsames Geheimwort geschützt.
//
// Env-Vars (Vercel):
//   MAIL_BRIDGE_SECRET   langes Zufallswort, dasselbe steht im Skript (Skripteigenschaften)
//   MAIL_SCRIPT_URL      Web-App-Adresse des Skripts (Bereitstellen, Web-App)

export const mailBrueckeKonfiguriert = () =>
  Boolean(process.env.MAIL_BRIDGE_SECRET?.trim() && process.env.MAIL_SCRIPT_URL?.trim());

/**
 * "KND-004" -> "Kunden/Kunde - 004". So heißen Davids Labels in Gmail: Das Oberlabel "Kunden" mit den
 * Unterlabels "Kunde - 002", "Kunde - 003" ... (der Schrägstrich bedeutet in Gmail "darunter").
 */
export const labelFuerNr = (nr: string): string => `Kunden/Kunde - ${nr.replace(/^\D+/, "").padStart(3, "0")}`;

export type SkriptAntwort = { ok: true } | { ok: false; fehler: string };

/** Ruft das Google-Skript auf. "archivieren" nimmt die Mail aus dem Posteingang, "label" legt das Label an und setzt es. */
export async function rufeSkript(
  aktion: "archivieren" | "label",
  mailId: string,
  label?: string,
): Promise<SkriptAntwort> {
  const url = process.env.MAIL_SCRIPT_URL?.trim();
  const secret = process.env.MAIL_BRIDGE_SECRET?.trim();
  if (!url || !secret) return { ok: false, fehler: "Die Gmail-Anbindung ist noch nicht eingerichtet (MAIL_SCRIPT_URL / MAIL_BRIDGE_SECRET fehlen bei Vercel)." };
  try {
    // Google leitet Web-Apps einmal um, fetch folgt dem automatisch.
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret, aktion, id: mailId, ...(label ? { label } : {}) }),
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let antwort: { ok?: boolean; fehler?: string } = {};
    try {
      antwort = JSON.parse(text);
    } catch {
      /* keine JSON-Antwort */
    }
    if (!res.ok || !antwort.ok) {
      console.error(`[mail] Skript-Aufruf "${aktion}" fehlgeschlagen: HTTP ${res.status} ${antwort.fehler ?? text.slice(0, 120)}`);
      return { ok: false, fehler: antwort.fehler ?? `Das Google-Skript hat nicht geantwortet (HTTP ${res.status}).` };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[mail] Skript-Aufruf "${aktion}" fehlgeschlagen:`, err);
    return { ok: false, fehler: "Das Google-Skript war nicht erreichbar." };
  }
}

/**
 * Finanzen A3: das erste PDF einer Mail (Rechnung) über das Google-Skript holen. null, wenn das Skript das noch nicht kann
 * (alter Stand), kein PDF da ist oder es zu groß ist. Braucht den Skriptstand vom 16.11.2026 (Auftrag „anhang“).
 */
export async function holeAnhang(mailId: string): Promise<{ name: string; typ: string; daten: Uint8Array } | null> {
  const url = process.env.MAIL_SCRIPT_URL?.trim();
  const secret = process.env.MAIL_BRIDGE_SECRET?.trim();
  if (!url || !secret) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret, aktion: "anhang", id: mailId }),
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
    const a = (await res.json().catch(() => ({}))) as { ok?: boolean; name?: string; typ?: string; daten?: string };
    if (!res.ok || !a.ok || !a.daten) return null;
    return { name: (a.name ?? "Beleg.pdf").slice(0, 120), typ: a.typ ?? "application/pdf", daten: Uint8Array.from(Buffer.from(a.daten, "base64")) };
  } catch {
    return null;
  }
}
