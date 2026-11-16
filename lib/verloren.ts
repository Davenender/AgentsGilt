// Verloren-Automat B1 (16.11.2026, Davids Fassung): suchen, abschalten, zurückholen. Regeln und Karte:
// lib/verloren-regeln.ts, Knöpfe: lib/verloren-handlers.ts. Schlüssel: VERCEL_TOKEN, GITHUB_TOKEN, STRIPE_SECRET_KEY
// (eingeschränkt), geprüft mit POST /api/schluessel. Gelöscht wird hier nichts.
import { notion } from "@/lib/finanzen";
import { seitenId } from "@/lib/notion-api";
import { githubAus, kndKurz, ohneVerlorenBeschreibung, passtZuKnd, schritte, stripeLinkAus, stripePasstZuKnd, vercelNameAus, verlorenBeschreibung, type Fund, type Loeschbar, type Merker, type Teil } from "@/lib/verloren-regeln";
import { betragText } from "@/lib/finanzen-regeln";

const TEAM = process.env.VERCEL_TEAM_ID || "team_aGDX333dwIk6UgZq6ACgeHaU";
type Antwort<T> = { status: number; json: T | null };

async function frage<T>(url: string, init: RequestInit): Promise<Antwort<T>> {
  try {
    const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return { status: res.status, json: (await res.json().catch(() => null)) as T | null };
  } catch {
    return { status: 0, json: null };
  }
}

function vercel<T>(pfad: string, method = "GET"): Promise<Antwort<T>> {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) return Promise.resolve({ status: 0, json: null });
  return frage<T>(`https://api.vercel.com${pfad}${pfad.includes("?") ? "&" : "?"}teamId=${TEAM}`, { method, headers: { Authorization: `Bearer ${token}` } });
}

function github<T>(pfad: string, method = "GET", body?: unknown): Promise<Antwort<T>> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) return Promise.resolve({ status: 0, json: null });
  return frage<T>(`https://api.github.com${pfad}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "agentsgilt-server", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function stripe<T>(pfad: string, form?: Record<string, string>): Promise<Antwort<T>> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return Promise.resolve({ status: 0, json: null });
  return frage<T>(`https://api.stripe.com/v1${pfad}`, {
    method: form ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    ...(form ? { body: new URLSearchParams(form).toString() } : {}),
  });
}

export type VerlorenKunde = { nr: string; name: string; email: string | null; vercel: string | null; github: string | null; zahlungslink: string | null; vertrag: string | null };

type NotionProps = Record<string, { url?: string | null; email?: string | null; title?: { plain_text?: string }[] } | undefined>;

/** Liest die Felder des Kunden aus Notion, die für das Abschalten zählen. */
export async function liesVerlorenKunde(seite: string, nr: string): Promise<VerlorenKunde | null> {
  const id = seitenId(seite);
  const p = id ? await notion<{ properties: NotionProps }>(`/pages/${id}`, "GET") : null;
  if (!p) return null;
  const url = (n: string) => p.properties[n]?.url?.trim() || null;
  return {
    nr,
    name: (p.properties["Name"]?.title ?? []).map((t) => t.plain_text ?? "").join("").trim() || nr,
    email: p.properties["E-Mail"]?.email?.trim() || null,
    vercel: url("Vercel-Projekt"),
    github: url("GitHub-Repo"),
    zahlungslink: url("Zahlungslink (Stripe)"),
    vertrag: url("Vertrag (DocuSign)"),
  };
}

const LAUFEND = ["active", "trialing", "past_due", "unpaid"];

/** Sucht alles zum Kunden (nur lesen). Was sich nicht prüfen lässt, steht unter „Hinweise“; Stripe im Zweifel als „läuft“. */
/** `ohne`: endgültig Gelöschtes (B2) nicht mehr suchen. */
export async function sucheAlles(k: VerlorenKunde, ohne: readonly Loeschbar[] = []): Promise<Fund> {
  const hinweise: string[] = [];
  const laufend: string[] = [];

  const vName = ohne.includes("vercel") ? null : vercelNameAus(k.vercel);
  if (k.vercel && !vName && !ohne.includes("vercel")) hinweise.push(`Vercel: „${k.vercel}“ ist keine *.vercel.app-Adresse, bitte selbst prüfen.`);
  let vFund: Fund["vercel"] = null;
  if (vName) {
    const r = await vercel<{ id?: string; name?: string; paused?: boolean }>(`/v9/projects/${encodeURIComponent(vName)}`);
    if (r.status === 200 && r.json?.id) vFund = { id: r.json.id, name: r.json.name ?? vName, pausiert: r.json.paused === true };
    else hinweise.push(`Vercel-Projekt „${vName}“ nicht gefunden (HTTP ${r.status}).`);
  }

  const gh = ohne.includes("github") ? null : githubAus(k.github);
  if (k.github && !gh && !ohne.includes("github")) hinweise.push(`GitHub: „${k.github}“ ist keine Repo-Adresse.`);
  let gFund: Fund["github"] = null;
  if (gh) {
    const r = await github<{ full_name?: string; archived?: boolean }>(`/repos/${gh}`);
    if (r.status === 200 && r.json?.full_name) gFund = { voll: r.json.full_name, archiviert: r.json.archived === true };
    else hinweise.push(`GitHub-Repo „${gh}“ nicht gefunden (HTTP ${r.status}).`);
  }

  // B4: Steht in Notion nichts, über die Kundennummer suchen („knd-003-…“).
  if (!k.vercel && !vFund && !ohne.includes("vercel")) {
    const r = await vercel<{ projects?: { id: string; name: string; paused?: boolean }[] }>(`/v9/projects?search=${encodeURIComponent(kndKurz(k.nr))}&limit=20`);
    const p = r.json?.projects?.find((x) => passtZuKnd(x.name, k.nr));
    if (p) {
      vFund = { id: p.id, name: p.name, pausiert: p.paused === true };
      hinweise.push(`Vercel-Projekt „${p.name}“ über die Kundennummer gefunden (in Notion nicht eingetragen).`);
    }
  }
  if (!k.github && !gFund && !ohne.includes("github")) {
    const r = await github<{ name: string; full_name: string; archived: boolean }[]>("/user/repos?per_page=100&affiliation=owner");
    const g = Array.isArray(r.json) ? r.json.find((x) => passtZuKnd(x.name, k.nr)) : undefined;
    if (g) {
      gFund = { voll: g.full_name, archiviert: g.archived };
      hinweise.push(`GitHub-Repo „${g.full_name}“ über die Kundennummer gefunden (in Notion nicht eingetragen).`);
    }
  }

  const sl = stripeLinkAus(k.zahlungslink);
  if (k.zahlungslink && !sl) hinweise.push(`Zahlungslink „${k.zahlungslink}“ ist kein Stripe-Link.`);
  let lFund: Fund["link"] = null;
  let pFund: Fund["promo"] = null;
  if (sl) {
    const r = await stripe<{ data?: { id: string; url: string; active: boolean }[] }>("/payment_links?limit=100");
    const l = r.json?.data?.find((x) => x.url === sl.url);
    if (l) lFund = { id: l.id, url: l.url, aktiv: l.active };
    else hinweise.push(r.status === 200 ? "Stripe-Zahlungslink nicht gefunden." : `Stripe nicht lesbar (HTTP ${r.status}).`);
    if (sl.promo) {
      const pr = await stripe<{ data?: { id: string; code: string; active: boolean }[] }>(`/promotion_codes?code=${encodeURIComponent(sl.promo)}&limit=1`);
      const c = pr.json?.data?.[0];
      if (c) pFund = { id: c.id, code: c.code, aktiv: c.active };
      else hinweise.push(`Rabattcode ${sl.promo} nicht gefunden.`);
    }
  }

  // B4: ohne Notion-Link über die Stripe-Metadaten (knd=KND-003, alt kunde=3)
  if (!sl) {
    const r = await stripe<{ data?: { id: string; url: string; active: boolean; metadata?: Record<string, string> }[] }>("/payment_links?limit=100");
    const l = r.json?.data?.find((x) => x.active && stripePasstZuKnd(x.metadata, k.nr)) ?? r.json?.data?.find((x) => stripePasstZuKnd(x.metadata, k.nr));
    if (l) {
      lFund = { id: l.id, url: l.url, aktiv: l.active };
      hinweise.push("Stripe-Zahlungslink über die Kundennummer gefunden (in Notion nicht eingetragen).");
    }
  }
  if (!pFund) {
    const r = await stripe<{ data?: { id: string; code: string; active: boolean; metadata?: Record<string, string> }[] }>("/promotion_codes?limit=100");
    const c = r.json?.data?.find((x) => stripePasstZuKnd(x.metadata, k.nr));
    if (c) pFund = { id: c.id, code: c.code, aktiv: c.active };
  }

  // Läuft noch eine Zahlung? Über die E-Mail des Kunden in Stripe. Lässt es sich nicht prüfen, gilt es als „läuft“.
  if (lFund || pFund) {
    if (!k.email) {
      laufend.push("nicht prüfbar (keine E-Mail in Notion)");
    } else {
      const kunden = await stripe<{ data?: { id: string }[] }>(`/customers?email=${encodeURIComponent(k.email)}&limit=5`);
      if (kunden.status !== 200) laufend.push(`nicht prüfbar (Stripe HTTP ${kunden.status})`);
      for (const c of kunden.json?.data ?? []) {
        const abos = await stripe<{ data?: { status: string; items?: { data?: { price?: { unit_amount?: number | null } }[] } }[] }>(`/subscriptions?customer=${c.id}&status=all&limit=10`);
        const rechnungen = await stripe<{ data?: { amount_remaining?: number }[] }>(`/invoices?customer=${c.id}&status=open&limit=5`);
        if (abos.status !== 200 || rechnungen.status !== 200) laufend.push("nicht prüfbar (Stripe)");
        for (const a of abos.json?.data ?? []) {
          if (!LAUFEND.includes(a.status)) continue;
          const cent = a.items?.data?.[0]?.price?.unit_amount;
          laufend.push(`Abo ${a.status === "active" ? "aktiv" : a.status}${typeof cent === "number" ? ` (${betragText(cent)} im Monat)` : ""}`);
        }
        for (const inv of rechnungen.json?.data ?? []) laufend.push(`offene Rechnung${typeof inv.amount_remaining === "number" ? ` ${betragText(inv.amount_remaining)}` : ""}`);
      }
    }
  }

  return { vercel: vFund, github: gFund, link: lFund, promo: pFund, laufend: [...new Set(laufend)], vertrag: k.vertrag, hinweise };
}

const fehler = (status: number) => `⚠️ ging nicht (HTTP ${status})`;

/** „▶️ Starten“: schaltet ab, was noch an ist. Zurück kommen das Ergebnis je Teil und die Kennungen für „Alles zurück“. */
export async function schalteAb(f: Fund, datum: string): Promise<{ ergebnisse: Partial<Record<Teil, string>>; abgeschaltet: Partial<Record<Teil, string>> }> {
  const { tun, gesperrt } = schritte(f);
  const ergebnisse: Partial<Record<Teil, string>> = {};
  const abgeschaltet: Partial<Record<Teil, string>> = {};
  for (const t of gesperrt) ergebnisse[t] = "⚠️ läuft noch, bleibt an. Bitte selbst prüfen.";

  if (tun.includes("vercel") && f.vercel) {
    const r = await vercel(`/v1/projects/${f.vercel.id}/pause`, "POST");
    if (r.status === 200) {
      ergebnisse.vercel = "⏸️ pausiert";
      abgeschaltet.vercel = f.vercel.id;
    } else ergebnisse.vercel = fehler(r.status);
  }
  if (tun.includes("github") && f.github) {
    // Erst Thema und Beschreibung (ein archiviertes Repo ist schreibgeschützt), dann archivieren.
    const repo = await github<{ description?: string | null; topics?: string[] }>(`/repos/${f.github.voll}`);
    const themen = [...new Set([...(repo.json?.topics ?? []), "verloren"])];
    await github(`/repos/${f.github.voll}/topics`, "PUT", { names: themen });
    await github(`/repos/${f.github.voll}`, "PATCH", { description: verlorenBeschreibung(repo.json?.description, datum) });
    const r = await github(`/repos/${f.github.voll}`, "PATCH", { archived: true });
    if (r.status === 200) {
      ergebnisse.github = "📦 archiviert (Thema „verloren“)";
      abgeschaltet.github = f.github.voll;
    } else ergebnisse.github = fehler(r.status);
  }
  if (tun.includes("link") && f.link) {
    const r = await stripe(`/payment_links/${f.link.id}`, { active: "false" });
    if (r.status === 200) {
      ergebnisse.link = "✅ deaktiviert";
      abgeschaltet.link = f.link.id;
    } else ergebnisse.link = fehler(r.status);
  }
  if (tun.includes("promo") && f.promo) {
    const r = await stripe(`/promotion_codes/${f.promo.id}`, { active: "false" });
    if (r.status === 200) {
      ergebnisse.promo = "✅ deaktiviert";
      abgeschaltet.promo = f.promo.id;
    } else ergebnisse.promo = fehler(r.status);
  }
  return { ergebnisse, abgeschaltet };
}

/** „↩️ Alles zurück“: schaltet nur wieder an, was der Bot selbst abgeschaltet hat (steht im Merker der Karte). */
export async function holeZurueck(m: Merker): Promise<Partial<Record<Teil, string>>> {
  const e: Partial<Record<Teil, string>> = {};
  if (m.vercel) {
    const r = await vercel(`/v1/projects/${m.vercel}/unpause`, "POST");
    e.vercel = r.status === 200 ? "▶️ läuft wieder" : fehler(r.status);
  }
  if (m.github) {
    const r = await github(`/repos/${m.github}`, "PATCH", { archived: false });
    if (r.status === 200) {
      const repo = await github<{ description?: string | null; topics?: string[] }>(`/repos/${m.github}`);
      await github(`/repos/${m.github}`, "PATCH", { description: ohneVerlorenBeschreibung(repo.json?.description) });
      await github(`/repos/${m.github}/topics`, "PUT", { names: (repo.json?.topics ?? []).filter((t) => t !== "verloren") });
      e.github = "📂 wieder aktiv";
    } else e.github = fehler(r.status);
  }
  if (m.link) {
    const r = await stripe(`/payment_links/${m.link}`, { active: "true" });
    e.link = r.status === 200 ? "✅ wieder aktiv" : fehler(r.status);
  }
  if (m.promo) {
    const r = await stripe(`/promotion_codes/${m.promo}`, { active: "true" });
    e.promo = r.status === 200 ? "✅ wieder aktiv" : fehler(r.status);
  }
  return e;
}

/** B2: endgültig löschen (nur nach Davids roter Bestätigung). Vercel nimmt Name oder Kennung, GitHub „Besitzer/Repo“. */
export async function loescheTeil(t: Loeschbar, name: string): Promise<{ ok: boolean; status: number }> {
  const r = t === "vercel" ? await vercel(`/v9/projects/${encodeURIComponent(name)}`, "DELETE") : await github(`/repos/${name}`, "DELETE");
  return { ok: r.status === 204 || r.status === 200, status: r.status };
}

/** B2: der Name, den der Bot heute aus Notion löschen würde (zum Abgleich mit der Karte). */
export function loeschName(t: Loeschbar, k: VerlorenKunde): string | null {
  return t === "vercel" ? vercelNameAus(k.vercel) : githubAus(k.github);
}
