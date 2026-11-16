// Regeln für den Team-Takt (/api/team/takt, cron-job.org jede Minute). Reine Logik: tests/team-takt.test.ts.

export const FREIGABE_ERINNERUNG_MS = 2 * 60 * 60 * 1000;

/** Eine Mail wartet seit 2 Stunden auf Davids Freigabe: einmal erinnern, nie von selbst senden. */
export const erinnerungFaellig = (gesendetAm: number, jetzt: number, schonErinnert: boolean) =>
  !schonErinnert && gesendetAm > 0 && jetzt - gesendetAm >= FREIGABE_ERINNERUNG_MS;

/** Wann eine Discord-Nachricht entstand, aus ihrer Kennung (Snowflake). 0, wenn die Kennung nicht passt. */
export function zeitAusId(id: string): number {
  if (!/^\d{15,20}$/.test(id)) return 0;
  return Number((BigInt(id) >> BigInt(22)) + BigInt(1420070400000));
}

export type GildenKanal = { id: string; name: string; type: number; parent_id?: string | null };

/** Textkanal mit genau diesem Namen aus der einmal je Takt geholten Kanalliste (Discord bremst sonst mit 429). */
export const kanalId = (liste: GildenKanal[], name: string): string | null =>
  liste.find((c) => c.type === 0 && c.name === name)?.id ?? null;

// ------------------------------------------------------------------ Follow-up-Erinnerung (Etappe 4, 16.11.2026)

const berlin = (d: Date) => {
  const t = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = (x: string) => t.find((p) => p.type === x)?.value ?? "";
  return { datum: `${g("year")}-${g("month")}-${g("day")}`, stunde: Number(g("hour")), minute: Number(g("minute")) };
};

/** Heutiges Datum nach deutscher Zeit, „JJJJ-MM-TT“. */
export const heuteBerlin = (d: Date) => berlin(d).datum;

/** Die Erinnerung läuft einmal am Tag zwischen 8:00 und 8:04 (der Takt läuft jede Minute, doppelt verhindert heuteSchonErinnert). */
export function followUpZeit(d: Date): boolean {
  const b = berlin(d);
  return b.stunde === 8 && b.minute < 5;
}

export function followUpHeute(kunden: { nr: string; followUp?: string | null; status: string }[], heute: string): string[] {
  return kunden.filter((k) => k.followUp === heute && k.status !== "Verloren").map((k) => k.nr);
}

const MARKE = "Heute steht an:";
export const followUpZeile = (zustaendige: string[], schritt: string) =>
  ["📌", ...zustaendige.map((id) => `<@${id}>`), MARKE, schritt.trim() || "nachfassen"].join(" ");

export function heuteSchonErinnert(nachrichten: { id: string; text: string }[], heute: string): boolean {
  return nachrichten.some((n) => n.text.startsWith("📌") && n.text.includes(MARKE) && heuteBerlin(new Date(zeitAusId(n.id))) === heute);
}
