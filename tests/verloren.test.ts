// Verloren-Automat B1 (16.11.2026, Davids Fassung): Karte in #posteingang, erst „Starten“ schaltet ab. Reine Logik, `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  githubAus,
  leseMerker,
  merkerText,
  schritte,
  stripeLinkAus,
  verlorenKarte,
  vercelNameAus,
  verlorenBeschreibung,
  ohneVerlorenBeschreibung,
  kopfAus,
  loeschFrage,
  mitGeloescht,
  type Fund,
} from "../lib/verloren-regeln.ts";

test("Vercel-Projekt aus dem Notion-Feld", () => {
  assert.equal(vercelNameAus("https://relaxfit-demo.vercel.app"), "relaxfit-demo");
  assert.equal(vercelNameAus("relaxfit-demo.vercel.app/"), "relaxfit-demo");
  assert.equal(vercelNameAus("https://vercel.com/david-agent-project/relaxfit-demo"), "relaxfit-demo");
  assert.equal(vercelNameAus("https://www.relaxfit.de"), null, "eigene Domain: Projekt nicht sicher erkennbar");
  assert.equal(vercelNameAus(null), null);
});

test("GitHub-Repo aus dem Notion-Feld", () => {
  assert.equal(githubAus("https://github.com/Davenender/relaxfit-demo"), "Davenender/relaxfit-demo");
  assert.equal(githubAus("github.com/Davenender/relaxfit-demo.git"), "Davenender/relaxfit-demo");
  assert.equal(githubAus("https://github.com/Davenender/relaxfit-demo/tree/main"), "Davenender/relaxfit-demo");
  assert.equal(githubAus("https://gitlab.com/x/y"), null);
});

test("Stripe-Zahlungslink und Rabattcode aus dem Notion-Feld", () => {
  assert.deepEqual(stripeLinkAus("https://buy.stripe.com/28EbJ16C1elTgzFcIQ1wY00?prefilled_promo_code=RELAXFIT1"), {
    url: "https://buy.stripe.com/28EbJ16C1elTgzFcIQ1wY00",
    promo: "RELAXFIT1",
  });
  assert.deepEqual(stripeLinkAus("https://buy.stripe.com/abc"), { url: "https://buy.stripe.com/abc", promo: null });
  assert.equal(stripeLinkAus("https://example.com/pay"), null);
});

const fund = (o: Partial<Fund> = {}): Fund => ({
  vercel: { id: "prj_1", name: "relaxfit-demo", pausiert: false },
  github: { voll: "Davenender/relaxfit-demo", archiviert: false },
  link: { id: "plink_1", url: "https://buy.stripe.com/x", aktiv: true },
  promo: { id: "promo_1", code: "RELAXFIT1", aktiv: true },
  laufend: [],
  vertrag: null,
  hinweise: [],
  ...o,
});

test("Starten: alles abschalten, was noch an ist; Stripe nur ohne laufende Zahlung", () => {
  assert.deepEqual(schritte(fund()), { tun: ["vercel", "github", "link", "promo"], gesperrt: [] });
  assert.deepEqual(schritte(fund({ laufend: ["Abo aktiv"] })), { tun: ["vercel", "github"], gesperrt: ["link", "promo"] });
  assert.deepEqual(
    schritte(fund({ vercel: { id: "prj_1", name: "x", pausiert: true }, github: { voll: "a/b", archiviert: true }, link: { id: "p", url: "u", aktiv: false }, promo: null })),
    { tun: [], gesperrt: [] },
    "schon aus: nichts doppelt",
  );
  assert.deepEqual(schritte(fund({ vercel: null, github: null, link: null, promo: null })), { tun: [], gesperrt: [] });
});

test("Merker auf der Karte: lesen und schreiben (nur Kennungen, keine Daten)", () => {
  const m = { nr: "KND-003", seite: "abc123", zustand: "gestartet" as const, vercel: "prj_1", github: "Davenender/relaxfit-demo", link: "plink_1", promo: "promo_1" };
  const t = merkerText(m);
  assert.match(t, /^vl1 /);
  assert.deepEqual(leseMerker(t), m);
  assert.deepEqual(leseMerker("vl1 nr=KND-002 seite=s1 z=offen"), { nr: "KND-002", seite: "s1", zustand: "offen" });
  assert.equal(leseMerker("etwas anderes"), null);
  assert.equal(leseMerker("vl1 nr=KND-002"), null, "ohne Seite und Zustand unbrauchbar");
});

test("GitHub-Beschreibung: Hinweis davor, beim Zurückholen wieder weg", () => {
  const b = verlorenBeschreibung("Relax-Fit Obertshausen – Website-Relaunch (Demo)", "16.11.2026");
  assert.equal(b, "Archiviert: verloren am 16.11.2026 · Relax-Fit Obertshausen – Website-Relaunch (Demo)");
  assert.equal(ohneVerlorenBeschreibung(b), "Relax-Fit Obertshausen – Website-Relaunch (Demo)");
  assert.equal(verlorenBeschreibung(b, "17.11.2026"), "Archiviert: verloren am 17.11.2026 · Relax-Fit Obertshausen – Website-Relaunch (Demo)", "nicht doppelt");
  assert.equal(verlorenBeschreibung(null, "16.11.2026"), "Archiviert: verloren am 16.11.2026");
});

test("Karte vor dem Start: Fund, Knöpfe Starten und Nichts tun, Warnung bei laufender Zahlung", () => {
  const k = { nr: "KND-003", name: "Relax Fit", grund: "Zu teuer", von: "123" };
  const { embed, components } = verlorenKarte(k, fund({ laufend: ["Abo aktiv (30,00 € im Monat)"], vertrag: "https://docusign.example/x" }), { nr: "KND-003", seite: "s", zustand: "offen" });
  assert.equal(embed.title, "⚪ KND-003 · Relax Fit ist verloren");
  const text = JSON.stringify(embed);
  assert.match(text, /relaxfit-demo/);
  assert.match(text, /Davenender\/relaxfit-demo/);
  assert.match(text, /RELAXFIT1/);
  assert.match(text, /läuft noch/);
  assert.match(text, /Abo aktiv/);
  assert.match(text, /docusign/);
  assert.match(embed.footer.text, /^vl1 nr=KND-003/);
  const ids = components.flatMap((r) => r.components.map((c) => c.custom_id));
  assert.deepEqual(ids, ["vl:start", "vl:nichts"]);
});

test("Karte nach dem Start: Ergebnis je Teil, „Alles zurück“ und (seit B2) die Löschen-Knöpfe", () => {
  const k = { nr: "KND-003", name: "Relax Fit", grund: "Zu teuer", von: "123" };
  const { embed, components } = verlorenKarte(k, fund(), { nr: "KND-003", seite: "s", zustand: "gestartet", vercel: "prj_1" }, { vercel: "⏸️ pausiert", github: "⚠️ ging nicht (HTTP 403)" });
  const text = JSON.stringify(embed);
  assert.match(text, /⏸️ pausiert/);
  assert.match(text, /ging nicht/);
  assert.deepEqual(components.flatMap((r) => r.components.map((c) => c.custom_id)), ["vl:zurueck", "vl:loeschen:vercel", "vl:loeschen:github"]);
  const nichts = verlorenKarte(k, fund(), { nr: "KND-003", seite: "s", zustand: "nichts" });
  assert.deepEqual(nichts.components, []);
});

test("Kopf der Karte zurücklesen (für die Knöpfe)", () => {
  const { embed } = verlorenKarte({ nr: "KND-003", name: "Relax Fit", grund: "Zu teuer", von: "123" }, fund(), { nr: "KND-003", seite: "s", zustand: "offen" });
  assert.deepEqual(kopfAus(embed), { name: "Relax Fit", grund: "Zu teuer", von: "123" });
  assert.equal(kopfAus({ title: "etwas", description: "" }), null);
});

const k3 = { nr: "KND-003", name: "Relax Fit", grund: "Zu teuer", von: "123" };
const ids = (c: { components: { custom_id: string }[] }[]) => c.flatMap((r) => r.components.map((x) => x.custom_id));

test("B2: nach dem Start je ein Löschen-Knopf für Demo und Repo, sonst nicht", () => {
  const gestartet = verlorenKarte(k3, fund(), { nr: "KND-003", seite: "s", zustand: "gestartet" });
  assert.deepEqual(ids(gestartet.components), ["vl:zurueck", "vl:loeschen:vercel", "vl:loeschen:github"]);
  const knopf = gestartet.components[1].components[0] as { style: number; label: string };
  assert.equal(knopf.style, 4, "rot");
  assert.match(knopf.label, /Demo löschen/);
  assert.deepEqual(ids(verlorenKarte(k3, fund({ vercel: null }), { nr: "KND-003", seite: "s", zustand: "gestartet" }).components), ["vl:zurueck", "vl:loeschen:github"]);
  assert.deepEqual(ids(verlorenKarte(k3, fund(), { nr: "KND-003", seite: "s", zustand: "offen" }).components), ["vl:start", "vl:nichts"], "vor dem Start nie löschen");
  assert.deepEqual(ids(verlorenKarte(k3, fund(), { nr: "KND-003", seite: "s", zustand: "zurueck" }).components), []);
});

test("B2: Merker merkt sich Gelöschtes", () => {
  const m = { nr: "KND-003", seite: "s", zustand: "gestartet" as const, promo: "promo_1", weg: ["vercel" as const, "github" as const] };
  assert.match(merkerText(m), /weg=vercel\+github/);
  assert.deepEqual(leseMerker(merkerText(m)), m);
});

test("B2: Gelöschtes steht auf der Karte, ohne Knopf", () => {
  const karte = verlorenKarte(k3, fund({ vercel: null }), { nr: "KND-003", seite: "s", zustand: "gestartet", weg: ["vercel"] });
  assert.match(JSON.stringify(karte.embed), /endgültig gelöscht/);
  assert.deepEqual(ids(karte.components), ["vl:zurueck", "vl:loeschen:github"]);
});

test("B2: rote Rückfrage nennt genau, was weg ist und was bleibt", () => {
  const f = loeschFrage("github", "Davenender/relaxfit-demo", "999");
  assert.match(f.content, /Davenender\/relaxfit-demo/);
  assert.match(f.content, /nicht rückgängig/);
  assert.match(f.content, /Ordner auf deinem Mac bleibt/);
  assert.deepEqual(ids(f.components), ["vl:loeschja:github:999", "vl:loeschnein"]);
  assert.equal((f.components[0].components[0] as { style: number }).style, 4);
  assert.match(loeschFrage("vercel", "relaxfit-demo", "999").content, /Demo-Adresse/);
});

test("B2: nach dem Löschen Karte anpassen (Feld, Merker, Knöpfe)", () => {
  const vorher = verlorenKarte(k3, fund(), { nr: "KND-003", seite: "s", zustand: "gestartet", vercel: "prj_1", github: "Davenender/relaxfit-demo" });
  const nach = mitGeloescht(vorher.embed, "vercel");
  assert.ok(nach);
  const feld = nach!.embed.fields?.find((x) => x.name === "Vercel-Demo");
  assert.match(feld!.value, /^relaxfit-demo\n🗑️ endgültig gelöscht/);
  const m = leseMerker(nach!.embed.footer?.text);
  assert.equal(m?.vercel, undefined, "Gelöschtes holt „Alles zurück“ nicht mehr");
  assert.equal(m?.github, "Davenender/relaxfit-demo");
  assert.deepEqual(m?.weg, ["vercel"]);
  assert.deepEqual(ids(nach!.components), ["vl:zurueck", "vl:loeschen:github"]);
  const beide = mitGeloescht(nach!.embed, "github");
  assert.deepEqual(ids(beide!.components), ["vl:zurueck"]);
  assert.equal(mitGeloescht({ title: "x" }, "vercel"), null);
});
