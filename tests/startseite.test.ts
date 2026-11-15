// Die neue Seite ist die Startseite (Prompt 15, 15.11.2026).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { GREETING } from "../lib/chat-text.ts";
import { FUSS_ANKER, NEUE_SEITE } from "../lib/neue-seite.ts";

const lies = (pfad: string) => readFileSync(new URL(`../${pfad}`, import.meta.url), "utf8");
const gibt = (pfad: string) => existsSync(new URL(`../${pfad}`, import.meta.url));

test("„/“ zeigt die neue Seite, die alte Startseite und die Varianten gibt es nicht mehr", () => {
  assert.equal(NEUE_SEITE, "/");
  assert.equal(FUSS_ANKER, "fuss");
  const start = lies("app/page.tsx");
  assert.match(start, /<Seite \/>/);
  assert.match(start, /<Welt>/);
  for (const alt of ["app/varianten", "components/ChatWidget.tsx", "components/Hero.tsx", "components/IntroTypewriter.tsx", "components/neu/aufbau", "public/varianten"]) {
    assert.ok(!gibt(alt), `${alt} ist entfernt`);
  }
});

test("alle /varianten-Adressen führen dauerhaft (308) auf „/“", () => {
  const konfig = lies("next.config.ts");
  assert.match(konfig, /\{ source: "\/varianten", destination: "\/", permanent: true \}/);
  assert.match(konfig, /\{ source: "\/varianten\/:pfad\*", destination: "\/", permanent: true \}/);
});

test("Startseite für Suchmaschinen freigegeben, mit Titel, Beschreibung, Vorschaubild und kanonischer Adresse", () => {
  const layout = lies("app/layout.tsx");
  assert.match(layout, /title: "Agents Gilt – KI-Lösungen für lokale Unternehmen"/);
  assert.match(layout, /canonical: "\/"/);
  assert.match(layout, /url: "\/logo-full.png"/);
  assert.ok(!/robots:/.test(layout), "kein noindex im Stammlayout");
  assert.ok(!/robots|noindex/.test(lies("app/page.tsx")));
  assert.ok(!/stunden/i.test(layout), "keine Stunden-Versprechen in den Metadaten");
  assert.match(lies("app/robots.ts"), /allow: "\/"/);
  assert.match(lies("app/sitemap.ts"), /url: "https:\/\/agentsgilt.com"/);
  // Besucherstatistik bleibt.
  assert.match(layout, /<Analytics \/>/);
});

test("der Chat steht einmal im Stammlayout, auf jeder Seite das Glasfenster", () => {
  const layout = lies("app/layout.tsx");
  assert.match(layout, /<WeltChat>\s*<ChatUeberall \/>\s*<\/WeltChat>/);
  assert.ok(!layout.includes("ChatWidget"));
  // Der Rahmen der Seiten bringt keinen eigenen Chat mehr mit (sonst gäbe es ihn doppelt).
  const rahmen = lies("components/neu/Rahmen.tsx");
  assert.ok(!/<ChatKnopf|<ChatFenster/.test(rahmen));
  // Der Startstand der Kugel hängt nur an der Adresse beim ersten Laden (ein Blatt ändert die Adresse, nicht die Seite).
  assert.match(lies("components/neu/chat/ChatUeberall.tsx"), /const \[startseite\] = useState\(\(\) => pfad === NEUE_SEITE\);/);
  // Die Hülle des Chats zeichnet keinen eigenen Kasten und färbt die Seite nicht dunkel.
  const welt = lies("components/neu/welt.css");
  assert.match(welt, /\.ag-neu\.ag-neu--chat \{\s*display: contents;/);
  assert.match(welt, /body:has\(\.ag-neu:not\(\.ag-neu--chat\)\)/);
});

test("Impressum und Datenschutz: Titel wie vorher, unabhängig von der Ladereihenfolge der Stylesheets", () => {
  // Eigene Seite 0,94 (wie die Versal-Überschriften), Blatt über der Startseite 0,98.
  const recht = lies("components/neu/recht/recht.css");
  assert.match(recht, /\.ag-recht__titel \{[^}]*line-height: 0\.98;/);
  assert.match(recht, /\.ag-rechtseite \.ag-recht__titel \{\s*line-height: 0\.94;\s*\}/);
  assert.match(lies("components/neu/recht/RechtSeite.tsx"), /klasse="ag-seite ag-rechtseite"/);
});

test("Überschrift: erst „Wochen“, dann „Tagen“; ohne Sternchen und Fußnote", () => {
  const texte = lies("lib/inhalt-neu.ts");
  assert.match(texte, /falsch: "Wochen"/);
  assert.match(texte, /richtig: "Tagen"/);
  assert.match(texte, /nach: ", wofür Agenturen Monate brauchen\."/);
  assert.match(texte, /agentur: \{ name: "Agentur", zeit: "Monate" \}/);
  assert.match(texte, /wir: \{ name: marke\.name, zeit: "Tage" \}/);
  assert.ok(!texte.includes("fussnote"));
  assert.ok(!/kein Versprechen/.test(texte));
  const aussage = lies("components/neu/seite/Aussage.tsx");
  assert.ok(!aussage.includes("ag-aussage__stern"));
  assert.ok(!aussage.includes("fussnote"));
  // Nirgends mehr ein Versprechen, in Stunden zu bauen.
  for (const datei of ["lib/inhalt-neu.ts", "lib/chatbot-knowledge.ts", "lib/content.ts"]) {
    assert.ok(!/(bauen|baut|gebaut|entwickeln)[^.\n]{0,30}in Stunden|in Stunden[^.\n]{0,40}(bauen|gebaut)/i.test(lies(datei)), datei);
  }
  // Die Textliste nennt die neue Überschrift als gültigen Stand (die alte nur noch als Geschichte).
  assert.ok(lies("docs/texte.md").includes("„Wir bauen in Tagen, wofür Agenturen Monate brauchen.“"));
});

test("das breitere Zwischenwort wird auf den Platz des echten Wortes gestaucht, Zusatzplätze verschwinden", () => {
  const spiel = lies("components/neu/seite/Entschluesselt.tsx");
  assert.match(spiel, /const skala = probeBreite > platz && probeBreite > 0 \? platz \/ probeBreite : 1;/);
  assert.match(spiel, /scaleX\(\$\{f\.erstSkala\.toFixed\(4\)\}\)/);
  assert.match(spiel, /if \(f\.zusatz\) \{/);
});

test("der Chat schreibt ohne Emojis", () => {
  assert.ok(!/\p{Extended_Pictographic}/u.test(GREETING.content));
  const wissen = lies("lib/chatbot-knowledge.ts");
  assert.match(wissen, /- Keine Emojis\./);
  assert.ok(!/\p{Extended_Pictographic}/u.test(wissen.replace(/⚠️/g, "")));
});
