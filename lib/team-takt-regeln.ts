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
