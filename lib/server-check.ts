// Davids Wunsch 16.11.2026: Einmal pro Woche (montags früh, im täglichen Aufruf /api/taeglich) prüft der Bot den
// Discord-Server und meldet nur, wenn etwas nicht stimmt (Karte in #posteingang). Grundlage ist die Discord-Durchsicht
// vom 16.11. (~/Desktop/Status/discord-durchsicht.md). Reine Logik: tests/server-check.test.ts. Netz: lib/server-check-lauf.ts.

const bit = (n: number) => BigInt(1) << BigInt(n);
export const RECHT = {
  admin: bit(3),
  kanaele: bit(4),
  sehen: bit(10),
  schreiben: bit(11),
  nachrichtenVerwalten: bit(13),
  verlauf: bit(16),
  rollen: bit(28),
  anheften: bit(51),
};

export const PFLICHT_KANAELE = ["willkommen", "posteingang", "anrufe", "anfragen", "leads", "termine", "statistik", "akademie", "luca"];

export type Rolle = { id: string; name: string; position: number; permissions: string; managed: boolean };
export type Sonderrecht = { id: string; type: number; allow: string; deny: string };
export type Kanal = { id: string; name: string; type: number; parent_id?: string | null; permission_overwrites?: Sonderrecht[] };
export type Lage = { rollen: Rolle[]; botRollen: string[]; kanaele: Kanal[]; /** Namen (klein) aller, die im Team oder Anwärter sind */ aktive: string[] };

const hat = (bits: string | bigint, recht: bigint) => (BigInt(bits) & recht) === recht;

/** Archiv-Tickets, die das Team noch beschreiben kann, mit den neuen Rechten (Schreiben verboten, Sehen und Verlauf bleiben). */
export function archivSperren(kanaele: Kanal[], teamRolle: string): { kanal: string; name: string; allow: string; deny: string }[] {
  const archiv = new Set(kanaele.filter((k) => k.type === 4 && k.name.toUpperCase() === "ARCHIV").map((k) => k.id));
  const out: { kanal: string; name: string; allow: string; deny: string }[] = [];
  for (const k of kanaele) {
    if (k.type !== 0 || !k.parent_id || !archiv.has(k.parent_id) || !/^geschlossen-ticket-/.test(k.name)) continue;
    const o = k.permission_overwrites?.find((x) => x.id === teamRolle && x.type === 0);
    if (o && hat(o.deny, RECHT.schreiben)) continue;
    const allow = o ? BigInt(o.allow) & ~RECHT.schreiben : BigInt(0);
    const deny = (o ? BigInt(o.deny) : BigInt(0)) | RECHT.schreiben;
    out.push({ kanal: k.id, name: k.name, allow: allow.toString(), deny: deny.toString() });
  }
  return out;
}

const RECHT_NAMEN: [keyof typeof RECHT, string][] = [
  ["sehen", "Kanäle ansehen"],
  ["schreiben", "Nachrichten senden"],
  ["kanaele", "Kanäle verwalten"],
  ["rollen", "Rollen verwalten"],
  ["anheften", "Nachrichten anheften"],
];

/** Alles, was nicht stimmt, je ein Satz mit dem nächsten Schritt. Leer = alles in Ordnung. */
export function pruefeServer(l: Lage): string[] {
  const m: string[] = [];
  const jeder = l.rollen.find((r) => r.name === "@everyone");
  const botRollen = l.rollen.filter((r) => l.botRollen.includes(r.id));
  const hoechste = Math.max(0, ...botRollen.map((r) => r.position));
  const darueber = l.rollen
    .filter((r) => r !== jeder && !l.botRollen.includes(r.id) && !r.managed && r.position >= hoechste)
    .sort((a, b) => b.position - a.position);
  if (darueber.length) {
    m.push(`Bot-Rolle steht unter ${darueber.map((r) => `„${r.name}“`).join(", ")} (oder gleich hoch): Diese Rollen kann der Bot nicht vergeben. → Servereinstellungen → Rollen → Bot-Rolle ganz nach oben ziehen.`);
  }
  const botRechte = [...botRollen, ...(jeder ? [jeder] : [])].reduce((a, r) => a | BigInt(r.permissions), BigInt(0));
  if (!hat(botRechte, RECHT.admin)) {
    const fehlt = RECHT_NAMEN.filter(([k]) => !(hat(botRechte, RECHT[k]) || (k === "anheften" && hat(botRechte, RECHT.nachrichtenVerwalten)))).map(([, n]) => n);
    if (fehlt.length) m.push(`Dem Bot fehlen Rechte: ${fehlt.join(", ")}. → Servereinstellungen → Rollen → Bot-Rolle → Berechtigungen.`);
  }
  const team = l.rollen.find((r) => r.name === "Team");
  if (team && hat(team.permissions, RECHT.nachrichtenVerwalten)) {
    m.push("Rolle „Team“ darf Nachrichten verwalten: Damit kann jeder im Team Bot-Karten löschen. → Recht bei der Rolle Team abschalten.");
  }
  if (team) for (const a of archivSperren(l.kanaele, team.id)) m.push(`#${a.name} ist fürs Team noch beschreibbar (Archiv).`);
  const aktive = new Set(l.aktive.map((n) => n.toLowerCase()));
  for (const k of l.kanaele) {
    const t = k.name.match(/^(?:📖lernpfad|📚bibliothek|🎭uebungen)-(.+)$/u);
    if (t && !aktive.has(t[1].toLowerCase())) m.push(`#${k.name} gehört niemandem mehr im Team (ausgetreten?). → Ins Archiv schieben oder löschen.`);
  }
  const namen = new Set(l.kanaele.map((k) => k.name));
  for (const p of PFLICHT_KANAELE) if (!namen.has(p)) m.push(`#${p} fehlt. Der Bot braucht diesen Kanal.`);
  return m;
}
