// Tests für das Kontaktformular: `npm test`. Im Test geht nichts wirklich raus (keine Mail, kein Discord, kein Push).
import assert from "node:assert/strict";
import { test } from "node:test";
import { antwortAuswerten, bearbeiteAnfrage, NETZ_FEHLER, UNBEKANNTER_FEHLER, ZUSTELL_FEHLER, type KontaktDienste, type MailErgebnis } from "../lib/kontakt-ablauf.ts";

const ANFRAGE = { name: "Marc", email: "marc@example.com", company: "", service: "Website", message: "Hallo", website: "" };

function dienste(team: () => Promise<MailErgebnis>, bestaetigung: () => Promise<MailErgebnis> = async () => ({ data: { id: "b" } })) {
  const log: string[] = [];
  const d: KontaktDienste = {
    mailAnsTeam: async () => (log.push("team"), team()),
    bestaetigung: async () => (log.push("bestaetigung"), bestaetigung()),
    weiterleiten: () => void log.push("discord"),
    protokoll: () => {},
  };
  return { d, log };
}

test("Alles klappt: ok, Discord, Mail ans Team und Bestätigung", async () => {
  const { d, log } = dienste(async () => ({ data: { id: "t" } }));
  assert.deepEqual(await bearbeiteAnfrage(ANFRAGE, d), { status: 200, body: { ok: true } });
  assert.deepEqual(log, ["discord", "team", "bestaetigung"]);
});

test("Resend meldet einen Fehler: 502, Discord bleibt, keine Bestätigung", async () => {
  const { d, log } = dienste(async () => ({ data: null, error: { name: "validation_error", message: "kaputt" } }));
  assert.deepEqual(await bearbeiteAnfrage(ANFRAGE, d), { status: 502, body: { error: ZUSTELL_FEHLER } });
  assert.deepEqual(log, ["discord", "team"]);
});

test("Resend-Schlüssel fehlt (übersprungen): 502", async () => {
  const { d, log } = dienste(async () => ({ id: null, skipped: true }));
  assert.equal((await bearbeiteAnfrage(ANFRAGE, d)).status, 502);
  assert.deepEqual(log, ["discord", "team"]);
});

test("Ausnahme beim Versand: 502", async () => {
  const { d, log } = dienste(async () => {
    throw new Error("Netz weg");
  });
  assert.deepEqual(await bearbeiteAnfrage(ANFRAGE, d), { status: 502, body: { error: ZUSTELL_FEHLER } });
  assert.deepEqual(log, ["discord", "team"]);
});

test("Nur die Bestätigung scheitert (Fehler, übersprungen oder Ausnahme): trotzdem ok", async () => {
  const faelle: (() => Promise<MailErgebnis>)[] = [
    async () => ({ data: null, error: { message: "Adresse vertippt" } }),
    async () => ({ id: null, skipped: true }),
    async () => {
      throw new Error("Netz weg");
    },
  ];
  for (const bestaetigung of faelle) {
    const { d } = dienste(async () => ({ data: { id: "t" } }), bestaetigung);
    assert.deepEqual(await bearbeiteAnfrage(ANFRAGE, d), { status: 200, body: { ok: true } });
  }
});

test("Spam-Falle ausgefüllt: still ok, keine Mail, kein Discord", async () => {
  const { d, log } = dienste(async () => ({ data: { id: "t" } }));
  assert.deepEqual(await bearbeiteAnfrage({ ...ANFRAGE, website: "https://spam.example" }, d), { status: 200, body: { ok: true } });
  assert.deepEqual(log, []);
});

test("Antwort im Formular: ok, Fehlertext, Antwort ohne JSON", () => {
  assert.deepEqual(antwortAuswerten(true, '{"ok":true}'), { ok: true });
  assert.deepEqual(antwortAuswerten(true, ""), { ok: true }, "ok ohne Inhalt zählt als angekommen");
  assert.deepEqual(antwortAuswerten(false, JSON.stringify({ error: ZUSTELL_FEHLER })), { error: ZUSTELL_FEHLER });
  assert.deepEqual(antwortAuswerten(false, "<html>Bad Gateway</html>"), { error: UNBEKANNTER_FEHLER });
  assert.deepEqual(antwortAuswerten(false, ""), { error: UNBEKANNTER_FEHLER });
  assert.deepEqual(antwortAuswerten(false, '{"error":""}'), { error: UNBEKANNTER_FEHLER });
  assert.match(NETZ_FEHLER, /Verbindung fehlgeschlagen/);
});
