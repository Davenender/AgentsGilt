// Prompt 17, Punkt 3: Discord antwortet mit 429 und retry_after. Vorher gab der Support-Chat sofort auf
// (23.11.2026, 16:08: 15 Kundennachrichten in 10 s kamen nicht an). Jetzt wartet er und versucht es erneut.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mitWiederholung, warteZeit } from "../lib/discord-wiederholen.ts";

const zuViel = (sekunden: number) =>
  new Response(JSON.stringify({ message: "You are being rate limited.", retry_after: sekunden, global: false }), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });
const ok = () => new Response(JSON.stringify({ id: "123" }), { status: 200 });

/** Eine Uhr, die nur beim Warten weiterläuft, und eine Liste der Antworten der Reihe nach. */
function nachgestellt(antworten: (() => Response)[]) {
  let uhr = 0;
  const gewartet: number[] = [];
  let aufrufe = 0;
  return {
    senden: async () => {
      aufrufe++;
      uhr += 50; // jede Anfrage dauert 50 ms
      return (antworten.shift() ?? ok)();
    },
    opt: { warte: async (ms: number) => void (gewartet.push(ms), (uhr += ms)), jetzt: () => uhr },
    gewartet,
    aufrufe: () => aufrufe,
  };
}

test("429 mit retry_after: wartet so lange und versucht es erneut", async () => {
  const n = nachgestellt([() => zuViel(0.75), ok]);
  const res = await mitWiederholung(n.senden, n.opt);
  assert.equal(res.status, 200);
  assert.deepEqual(n.gewartet, [750]);
  assert.equal(n.aufrufe(), 2);
});

test("höchstens zwei neue Versuche", async () => {
  const zweimal = nachgestellt([() => zuViel(0.3), () => zuViel(0.3), ok]);
  assert.equal((await mitWiederholung(zweimal.senden, zweimal.opt)).status, 200);
  assert.equal(zweimal.aufrufe(), 3);

  const dreimal = nachgestellt([() => zuViel(0.3), () => zuViel(0.3), () => zuViel(0.3), ok]);
  assert.equal((await mitWiederholung(dreimal.senden, dreimal.opt)).status, 429);
  assert.equal(dreimal.aufrufe(), 3);
});

test("höchstens 5 Sekunden insgesamt: zu langes retry_after gibt sofort auf", async () => {
  const lang = nachgestellt([() => zuViel(7), ok]);
  assert.equal((await mitWiederholung(lang.senden, lang.opt)).status, 429);
  assert.deepEqual(lang.gewartet, []);

  // 2,5 s + 2,5 s passen nicht beide hinein: der zweite Versuch unterbleibt.
  const knapp = nachgestellt([() => zuViel(2.5), () => zuViel(2.5), ok]);
  assert.equal((await mitWiederholung(knapp.senden, knapp.opt)).status, 429);
  assert.deepEqual(knapp.gewartet, [2500]);
});

test("andere Fehler werden nicht wiederholt", async () => {
  const n = nachgestellt([() => new Response("nein", { status: 403 }), ok]);
  assert.equal((await mitWiederholung(n.senden, n.opt)).status, 403);
  assert.equal(n.aufrufe(), 1);
});

test("Wartezeit aus dem Kopf Retry-After, wenn die Antwort kein retry_after hat", async () => {
  assert.equal(await warteZeit(new Response("", { status: 429, headers: { "Retry-After": "2" } })), 2000);
  assert.equal(await warteZeit(zuViel(0.123)), 123);
  assert.equal(await warteZeit(new Response("", { status: 429 })), 1000);
});

test("alle Discord-Aufrufe des Support-Chats laufen über die Wiederholung", () => {
  const src = readFileSync(new URL("../lib/support.ts", import.meta.url), "utf8");
  const aufruf = src.slice(src.indexOf("async function call<T>"), src.indexOf("// -------------------------------------------------------------------- Schlüssel"));
  assert.match(aufruf, /mitWiederholung\(/);
  // Außer in call() spricht die Datei Discord nirgends direkt an.
  assert.equal(src.split("fetch(`${API}").length - 1, 1);
});
