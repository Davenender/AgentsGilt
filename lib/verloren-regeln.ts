// Verloren-Automat B1 (16.11.2026, Davids Fassung): Wird ein Kunde ⚪ Verloren, kommt eine Karte in #posteingang mit
// allem, was der Bot zum Kunden findet. Erst David drückt „▶️ Starten“: Vercel-Demo pausieren, Stripe-Link und
// Rabattcode deaktivieren (nur ohne laufende Zahlung), GitHub-Repo archivieren. „↩️ Alles zurück“ holt es wieder.
// Ordner, Code und Gmail-Label bleiben immer. Reine Logik: tests/verloren.test.ts. Netz: lib/verloren.ts.
import type { EmbedLike } from "./discord-calls.ts";

export type Teil = "vercel" | "github" | "link" | "promo";
export type Fund = {
  vercel: { id: string; name: string; pausiert: boolean } | null;
  github: { voll: string; archiviert: boolean } | null;
  link: { id: string; url: string; aktiv: boolean } | null;
  promo: { id: string; code: string; aktiv: boolean } | null;
  /** Laufende Zahlungen (Abo aktiv, offene Rechnung): dann bleiben Link und Rabattcode an. */
  laufend: string[];
  vertrag: string | null;
  /** Was im Notion-Feld steht, aber nicht gefunden oder nicht lesbar war. */
  hinweise: string[];
};
export type Zustand = "offen" | "gestartet" | "zurueck" | "nichts";
export type Loeschbar = "vercel" | "github";
/** weg: was David nach dem Start endgültig gelöscht hat (B2). */
export type Merker = { nr: string; seite: string; zustand: Zustand; weg?: Loeschbar[] } & Partial<Record<Teil, string>>;

/** Vercel-Projektname aus „https://name.vercel.app“ oder „vercel.com/team/name“. Eigene Domain: null. */
export function vercelNameAus(url: string | null | undefined): string | null {
  const s = (url ?? "").trim().replace(/^https?:\/\//, "");
  const app = s.match(/^([a-z0-9-]+)\.vercel\.app(\/|$)/i);
  if (app) return app[1].toLowerCase();
  const dash = s.match(/^vercel\.com\/[^/]+\/([a-z0-9._-]+)/i);
  return dash ? dash[1].toLowerCase() : null;
}

/** „Besitzer/Repo“ aus einer GitHub-Adresse. */
export function githubAus(url: string | null | undefined): string | null {
  const m = (url ?? "").trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#]|$)/i);
  return m ? `${m[1]}/${m[2]}` : null;
}

/** Stripe-Zahlungslink ohne Zusätze und der vorausgefüllte Rabattcode. */
export function stripeLinkAus(url: string | null | undefined): { url: string; promo: string | null } | null {
  try {
    const u = new URL((url ?? "").trim());
    if (u.hostname !== "buy.stripe.com") return null;
    return { url: `${u.origin}${u.pathname}`, promo: u.searchParams.get("prefilled_promo_code") };
  } catch {
    return null;
  }
}

/** Was „Starten“ tut: nur, was noch an ist. Stripe bleibt an, solange eine Zahlung läuft. */
export function schritte(f: Fund): { tun: Teil[]; gesperrt: Teil[] } {
  const tun: Teil[] = [];
  const gesperrt: Teil[] = [];
  if (f.vercel && !f.vercel.pausiert) tun.push("vercel");
  if (f.github && !f.github.archiviert) tun.push("github");
  for (const t of ["link", "promo"] as const) {
    if (!f[t]?.aktiv) continue;
    (f.laufend.length ? gesperrt : tun).push(t);
  }
  return { tun, gesperrt };
}

const TEILE: Teil[] = ["vercel", "github", "link", "promo"];
const ZUSTAENDE: Zustand[] = ["offen", "gestartet", "zurueck", "nichts"];

/** Merker in der Fußzeile der Karte: nur Kennungen dessen, was der Bot abgeschaltet hat. */
export function merkerText(m: Merker): string {
  return ["vl1", `nr=${m.nr}`, `seite=${m.seite}`, `z=${m.zustand}`, ...TEILE.filter((t) => m[t]).map((t) => `${t}=${m[t]}`), ...(m.weg?.length ? [`weg=${m.weg.join("+")}`] : [])].join(" ");
}

export function leseMerker(s: string | null | undefined): Merker | null {
  const teile = (s ?? "").trim().split(/\s+/);
  if (teile[0] !== "vl1") return null;
  const w = Object.fromEntries(teile.slice(1).map((x) => [x.slice(0, x.indexOf("=")), x.slice(x.indexOf("=") + 1)]));
  if (!w.nr || !w.seite || !ZUSTAENDE.includes(w.z as Zustand)) return null;
  const m: Merker = { nr: w.nr, seite: w.seite, zustand: w.z as Zustand };
  for (const t of TEILE) if (w[t]) m[t] = w[t];
  const weg = (w.weg ?? "").split("+").filter((x): x is Loeschbar => x === "vercel" || x === "github");
  if (weg.length) m.weg = weg;
  return m;
}

const VORSATZ = /^Archiviert: verloren am \d{2}\.\d{2}\.\d{4}(?: · )?/;
/** GitHub-Beschreibung mit Hinweis davor (nicht doppelt). */
export function verlorenBeschreibung(alt: string | null | undefined, datum: string): string {
  const rest = (alt ?? "").replace(VORSATZ, "").trim();
  return `Archiviert: verloren am ${datum}${rest ? ` · ${rest}` : ""}`.slice(0, 350);
}
export const ohneVerlorenBeschreibung = (s: string | null | undefined) => (s ?? "").replace(VORSATZ, "").trim();

type Knopf = { type: 2; style: number; label: string; custom_id: string };
type Reihe = { type: 1; components: Knopf[] };

const GELOESCHT = "🗑️ endgültig gelöscht";

function teilWert(t: Teil, f: Fund, gesperrt: boolean, ergebnis: string | undefined, weg: Loeschbar[]): string {
  const name =
    t === "vercel" ? f.vercel?.name : t === "github" ? f.github?.voll : t === "link" ? f.link?.url : f.promo?.code;
  if ((t === "vercel" || t === "github") && weg.includes(t)) return name ? `${name}\n${GELOESCHT}` : GELOESCHT;
  if (!name) return "nichts gefunden";
  const stand =
    ergebnis ??
    (gesperrt
      ? "⚠️ läuft noch, bleibt an. Bitte selbst prüfen."
      : t === "vercel"
        ? f.vercel?.pausiert ? "schon pausiert" : "läuft"
        : t === "github"
          ? f.github?.archiviert ? "schon archiviert" : "aktiv"
          : f[t]?.aktiv ? "aktiv" : "schon aus");
  return `${t === "github" ? `\`${name}\`` : name}\n${stand}`.slice(0, 1024);
}

const TITEL: Record<Teil, string> = { vercel: "Vercel-Demo", github: "GitHub-Repo", link: "Stripe-Zahlungslink", promo: "Rabattcode" };
const LOESCH_LABEL: Record<Loeschbar, string> = { vercel: "🗑️ Demo löschen", github: "🗑️ Repo löschen" };

/** Knöpfe je Zustand; nach dem Start dazu je ein roter Löschen-Knopf (B2). */
function knoepfe(zustand: Zustand, loeschbar: readonly Loeschbar[]): Reihe[] {
  if (zustand === "offen") return [{ type: 1, components: [{ type: 2, style: 3, label: "▶️ Starten", custom_id: "vl:start" }, { type: 2, style: 2, label: "Nichts tun", custom_id: "vl:nichts" }] }];
  if (zustand !== "gestartet") return [];
  return [
    { type: 1, components: [{ type: 2, style: 2, label: "↩️ Alles zurück", custom_id: "vl:zurueck" }] },
    ...(loeschbar.length ? [{ type: 1 as const, components: loeschbar.map((t) => ({ type: 2 as const, style: 4, label: LOESCH_LABEL[t], custom_id: `vl:loeschen:${t}` })) }] : []),
  ];
}

/** Die Karte in #posteingang, je nach Zustand mit „Starten“/„Nichts tun“ oder „Alles zurück“. */
export function verlorenKarte(
  k: { nr: string; name: string; grund: string; von: string },
  f: Fund,
  m: Merker,
  ergebnisse: Partial<Record<Teil, string>> = {},
): { embed: EmbedLike & { title: string; footer: { text: string }; color: number }; components: Reihe[] } {
  const { gesperrt } = schritte(f);
  const kopf =
    m.zustand === "offen"
      ? "Noch ist nichts abgeschaltet. **▶️ Starten** schaltet ab, was unten steht, alles lässt sich zurückholen. Ordner, Code und Gmail-Label bleiben immer."
      : m.zustand === "gestartet"
        ? "Abgeschaltet, wie unten steht. **↩️ Alles zurück** schaltet es wieder an."
        : m.zustand === "zurueck"
          ? "Alles wieder angeschaltet."
          : "Nichts abgeschaltet (so gewollt).";
  const fields = [
    ...TEILE.map((t) => ({ name: TITEL[t], value: teilWert(t, f, gesperrt.includes(t) && !ergebnisse[t], ergebnisse[t], m.weg ?? []), inline: true })),
    { name: "Zahlungen", value: f.laufend.length ? `⚠️ läuft noch: ${f.laufend.join(" · ")}`.slice(0, 1024) : "keine laufende Zahlung gefunden", inline: false },
    ...(f.vertrag ? [{ name: "Vertrag (DocuSign)", value: `${f.vertrag}\nbleibt, wie er ist`.slice(0, 1024), inline: false }] : []),
    ...(f.hinweise.length ? [{ name: "Hinweise", value: f.hinweise.join("\n").slice(0, 1024), inline: false }] : []),
  ];
  const loeschbar = (["vercel", "github"] as const).filter((t) => f[t] && !(m.weg ?? []).includes(t));
  const components = knoepfe(m.zustand, loeschbar);
  return {
    embed: {
      title: `⚪ ${k.nr} · ${k.name} ist verloren`.slice(0, 256),
      description: `Grund: ${k.grund} · gesetzt von <@${k.von}>\n${kopf}`,
      color: m.zustand === "offen" ? 0xd4a23c : 0x6b7280,
      fields,
      footer: { text: merkerText(m) },
    },
    components,
  };
}

/** Name, Grund und wer es gesetzt hat, aus der Karte zurücklesen (für die Knöpfe). */
export function kopfAus(e: EmbedLike | null | undefined): { name: string; grund: string; von: string } | null {
  const t = (e?.title ?? "").match(/^⚪ KND-\d+ · (.+) ist verloren$/);
  const d = (e?.description ?? "").match(/^Grund: (.+?) · gesetzt von <@(\d+)>/);
  return t && d ? { name: t[1], grund: d[1], von: d[2] } : null;
}


/** Rote Rückfrage vor dem endgültigen Löschen (nur für David sichtbar). */
export function loeschFrage(t: Loeschbar, name: string, kartenId: string): { content: string; components: Reihe[] } {
  const was =
    t === "vercel"
      ? `🗑️ **Vercel-Projekt „${name}“ endgültig löschen?**\nDas lässt sich nicht rückgängig machen: Die Demo-Adresse ist danach weg.`
      : `🗑️ **GitHub-Repo „${name}“ endgültig löschen?**\nDas lässt sich nicht rückgängig machen: Der Code auf GitHub ist danach weg.`;
  return {
    content: `${was} Der Ordner auf deinem Mac bleibt.`,
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 4, label: "Ja, endgültig löschen", custom_id: `vl:loeschja:${t}:${kartenId}` },
          { type: 2, style: 2, label: "Abbrechen", custom_id: "vl:loeschnein" },
        ],
      },
    ],
  };
}

/** Karte nach dem Löschen: Feld zeigt „gelöscht“, Merker ohne die Kennung (Alles zurück lässt es aus), Knopf weg. */
export function mitGeloescht(e: EmbedLike, t: Loeschbar): { embed: EmbedLike; components: Reihe[] } | null {
  const m = leseMerker(e.footer?.text);
  const felder = e.fields ?? [];
  const feld = felder.find((x) => x.name === TITEL[t]);
  if (!m || !feld) return null;
  const neu: Merker = { ...m, weg: [...new Set([...(m.weg ?? []), t])] };
  delete neu[t];
  const fields = felder.map((x) => (x === feld ? { ...x, value: `${x.value.split("\n")[0]}\n${GELOESCHT}`.slice(0, 1024) } : x));
  const loeschbar = (["vercel", "github"] as const).filter((x) => {
    const v = fields.find((y) => y.name === TITEL[x])?.value ?? "nichts gefunden";
    return !v.startsWith("nichts gefunden") && !v.includes(GELOESCHT) && !(neu.weg ?? []).includes(x);
  });
  return { embed: { ...e, fields, footer: { text: merkerText(neu) } }, components: knoepfe(m.zustand, loeschbar) };
}
