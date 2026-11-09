import { aufnahmeStand } from "@/lib/akademie";
import { holeInhalt, leseAkademie, schritteVon, zeichne, type Inhalt } from "@/lib/akademie-daten";
import { call } from "@/lib/leads";
import { pusheDavid } from "@/lib/ntfy";
import { aufnahmetestAn, DAVID_ID, mitglied } from "@/lib/team";
import { registerKanal, schreibeTeam } from "@/lib/team-daten";
import { setzeRolle } from "@/lib/team-rollen";
import type { Person } from "@/lib/akademie";

// Aufnahmetest (Plan 4, Etappe 3): Wer als Anwärter alle Tests und 3 Übungen ab 70 Punkten geschafft hat, kommt
// automatisch ins Team (Davids Entscheidung): Register, Rolle, Glückwunsch im Lernpfad, Meldung an David.

/** Hat die Person den Aufnahmetest bestanden? null = Akademie nicht lesbar. */
export async function hatBestanden(token: string, userId: string, vorab?: { p: Person; inhalt: Inhalt }): Promise<boolean | null> {
  let p = vorab?.p;
  let inhalt = vorab?.inhalt;
  if (!p || !inhalt) {
    const [ak, i] = await Promise.all([leseAkademie(token), holeInhalt()]);
    p = ak?.personen.get(userId);
    inhalt = i ?? undefined;
  }
  if (!p || !inhalt) return null;
  return aufnahmeStand(schritteVon(p, inhalt), p.bestanden, p.uebungen ?? []).bestanden;
}

/** Nach einem Test oder einer Übung: Anwärter, die bestanden haben, ins Team holen. */
export async function pruefeAufnahme(token: string, userId: string, vorab?: { p: Person; inhalt: Inhalt }): Promise<boolean> {
  const m = mitglied(userId);
  if (!m || m.status !== "anwaerter") return false;
  if (!(await hatBestanden(token, userId, vorab))) {
    // Stand im Lernpfad aktualisieren (Zeile „Aufnahmetest: …“)
    if (vorab) await zeichne(token, userId, vorab.p, vorab.inhalt);
    return false;
  }
  await befoerdere(token, userId, vorab);
  return true;
}

/** Ins Team holen: Register, Rolle, Glückwunsch, Meldung an David. */
export async function befoerdere(token: string, userId: string, vorab?: { p: Person; inhalt: Inhalt }): Promise<void> {
  const m = mitglied(userId);
  if (!m) return;
  await schreibeTeam(token, { ...m, status: "team" });
  const rolle = await setzeRolle(token, userId, "team");
  let p = vorab?.p;
  let inhalt = vorab?.inhalt;
  if (!p || !inhalt) {
    const [ak, i] = await Promise.all([leseAkademie(token), holeInhalt()]);
    p = ak?.personen.get(userId);
    inhalt = i ?? undefined;
  }
  if (p && inhalt) {
    await zeichne(token, userId, p, inhalt);
    await call(token, "POST", `/channels/${p.lernpfad}/messages`, {
      embeds: [{ title: "🎉 Aufnahmetest bestanden!", color: 0x22c55e, description: `Glückwunsch, ${m.name}! Du hast alle Tests und die Übungen geschafft und bist jetzt im Team. Ab sofort siehst du alle Arbeitskanäle (Leads, Anfragen, Kunden) und kannst mitarbeiten. Schau als Erstes in #willkommen.` }],
      allowed_mentions: { parse: [] },
    });
  }
  const kanal = await registerKanal(token);
  if (kanal) await call(token, "POST", `/channels/${kanal}/messages`, { content: `🎓 **${m.name}** hat den Aufnahmetest bestanden und ist jetzt im Team.${rolle ? "" : " ⚠️ Die Rolle Team bitte von Hand geben."}`, allowed_mentions: { parse: [] } });
  await pusheDavid("🎓 Aufnahmetest bestanden", `${m.name} hat den Aufnahmetest bestanden und ist jetzt im Team.`);
}

/** Ziel-Status beim Aufnehmen oder Zurückholen: Team, außer der Aufnahmetest ist an und noch nicht bestanden. */
export async function zielStatus(token: string, userId: string): Promise<"team" | "anwaerter"> {
  if (!aufnahmetestAn() || userId === DAVID_ID) return "team";
  return (await hatBestanden(token, userId)) ? "team" : "anwaerter";
}
