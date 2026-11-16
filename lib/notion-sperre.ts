// Notion-Sperre durch Zurücksetzen (Etappe 6, 16.11.2026, Davids Wunsch). Notion kann keine Felder sperren,
// darum merkt sich der Bot den gültigen Stand (lib/kunden-stand.ts) und schaut bei jeder Änderung, wer sie gemacht hat:
//   David oder der Bot selbst → gilt (neuer Stand) · Teammitglied → zurück auf den Stand, kurze DM an die Person.
// Erlaubt bleiben der Gesprächsbogen im Seitentext und das Lesen. „Zuständig“ setzt weiter die Karte zurück
// (lib/zustaendige.ts), darum fehlt es beim Vergleich hier. Reine Logik ohne Netz: tests/notion-sperre.test.ts.

export const GESPERRT: readonly string[] = [
  // Checkliste und Kontakt
  "Status", "Angebot raus", "Vertrag unterschrieben", "AVV unterschrieben", "Anzahlung erhalten", "Material erhalten", "Abnahme erfolgt",
  "Live / Übergeben", "Nächster Schritt", "Nächstes Follow-up", "E-Mail", "Telefon", "Zuständig",
  // Angebot und Geld
  "Angebot", "Angebot (Link)", "Setup-Preis (€)", "Retainer (€/Monat)", "Wert (€)", "Zahlungsstatus", "Zahlungslink (Stripe)", "Vertrag (DocuSign)", "Vertrag am",
  // Technik und Betreuung
  "Ordner (Desktop)", "GitHub-Repo", "Vercel-Projekt", "Domain / Anbieter", "Gmail-Label", "Retainer-Start", "Kündigungsfrist", "Nächster Report", "Nächste Wartung",
  // Sonstiges
  "Zufriedenheit", "Referenz erlaubt", "Quelle", "Erstkontakt", "Verlustgrund", "Demo-Status", "Demo-Link", "Aufwand (in Stunden)", "Name",
];

/** Das setzt die Karte zurück, nicht der Stand. */
const NICHT_UEBER_STAND = new Set(["Zuständig"]);

export type Wer = "david" | "bot" | "team" | "unbekannt";
const ohneStriche = (s: string) => s.replace(/-/g, "").toLowerCase();

/** Wer eine Seite zuletzt geändert hat. Ohne Bearbeiter oder ohne Bot-Kennung lieber „unbekannt“ (dann passiert nichts). */
export function werHat(editor: string | null | undefined, botId: string | null | undefined, davidId: string): Wer {
  if (!editor) return "unbekannt";
  const e = ohneStriche(editor);
  if (e === ohneStriche(davidId)) return "david";
  if (!botId) return "unbekannt";
  return e === ohneStriche(botId) ? "bot" : "team";
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});

/** Bearbeiter aus der Notion-Meldung (Stand im Moment der Änderung). null, wenn die Meldung ihn nicht mitschickt. */
export function editorAus(payload: unknown): string | null {
  const p = obj(payload);
  const id = obj(obj(p.data).last_edited_by).id ?? obj(p.source).user_id;
  return typeof id === "string" && id ? id : null;
}

/** Ein Feld im Stand: [Notion-Typ, einfacher Wert]. */
export type StandWert = [string, unknown];
export type Stand = Record<string, StandWert>;

const text = (arr: unknown) =>
  (Array.isArray(arr) ? arr : [])
    .map((x) => {
      const o = obj(x);
      return typeof o.plain_text === "string" ? o.plain_text : String(obj(o.text).content ?? "");
    })
    .join("")
    .trim();

/** Der einfache Wert einer Notion-Eigenschaft. undefined = nicht schreibbar (Formel, Rollup, Relation …). */
function einfach(p: unknown): StandWert | undefined {
  const o = obj(p);
  const t = typeof o.type === "string" ? o.type : "";
  switch (t) {
    case "checkbox":
      return [t, o.checkbox === true];
    case "select":
    case "status":
      return [t, (obj(o[t]).name as string | undefined) ?? null];
    case "rich_text":
    case "title":
      return [t, text(o[t])];
    case "number":
      return [t, typeof o.number === "number" ? o.number : null];
    case "date": {
      const d = obj(o.date);
      return [t, typeof d.start === "string" ? { start: d.start, end: typeof d.end === "string" ? d.end : null } : null];
    }
    case "url":
    case "email":
    case "phone_number":
      return [t, typeof o[t] === "string" && (o[t] as string).trim() ? (o[t] as string).trim() : null];
    case "people":
      return [t, (Array.isArray(o.people) ? o.people : []).map((u) => String(obj(u).id ?? "")).filter(Boolean).sort()];
    default:
      return undefined;
  }
}

/** Der Stand aller gesperrten Felder einer Seite. */
export function standAus(props: Record<string, unknown>): Stand {
  const s: Stand = {};
  for (const n of GESPERRT) {
    const w = props[n] === undefined ? undefined : einfach(props[n]);
    if (w) s[n] = w;
  }
  return s;
}

/** Gesperrte Felder, die vom Stand abweichen. Fehlt ein Feld in der Meldung oder im Stand, zählt es nicht. */
export function abweichungen(props: Record<string, unknown>, stand: Stand): string[] {
  const jetzt = standAus(props);
  return GESPERRT.filter((n) => !NICHT_UEBER_STAND.has(n) && jetzt[n] && stand[n] && JSON.stringify(jetzt[n][1]) !== JSON.stringify(stand[n][1]));
}

const stuecke = (s: string) => {
  const out: { type: "text"; text: { content: string } }[] = [];
  for (let i = 0; i < s.length; i += 2000) out.push({ type: "text", text: { content: s.slice(i, i + 2000) } });
  return out;
};

/** Notion-PATCH-Form, um die Felder auf den Stand zurückzusetzen. */
export function rueckProps(stand: Stand, namen: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const n of namen) {
    const sw = stand[n];
    if (!sw) continue;
    const [t, v] = sw;
    if (t === "checkbox") out[n] = { checkbox: v === true };
    else if (t === "select" || t === "status") out[n] = { [t]: v ? { name: String(v) } : null };
    else if (t === "rich_text" || t === "title") out[n] = { [t]: stuecke(typeof v === "string" ? v : "") };
    else if (t === "number") out[n] = { number: typeof v === "number" ? v : null };
    else if (t === "date") out[n] = { date: v ?? null };
    else if (t === "url" || t === "email" || t === "phone_number") out[n] = { [t]: typeof v === "string" && v ? v : null };
    else if (t === "people") out[n] = { people: (Array.isArray(v) ? v : []).map((id) => ({ object: "user", id: String(id) })) };
  }
  return out;
}

/** Eine Eigenschaft in der Form, die die Kundenkarte liest (für den zurückgesetzten Wert). */
export const alsKartenProp = (sw: StandWert): Record<string, unknown> & { type: string } => ({ type: sw[0], ...(obj(rueckProps({ x: sw }, ["x"]).x) as Obj) });

/** Die kurze DM an die Person, deren Änderung zurückgesetzt wurde. */
export const sperrHinweis = (nr: string, name: string, felder: string[], kanal: string | null) =>
  `↩️ Bei **${nr} · ${name}** habe ich ${felder.map((f) => `„${f}“`).join(", ")} in Notion zurückgesetzt. Das ändert ihr bitte über die Knöpfe im Kundenkanal${kanal ? ` <#${kanal}>` : ""}. Notion ist zum Nachlesen und für den Gesprächsbogen da.`;
