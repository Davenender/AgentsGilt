// Kategorie „🗄️ SPEICHER“ ganz unten für die Merkzettel des Bots (16.11.2026, Davids Wunsch). `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { SPEICHER_KANAELE, speicherPlan } from "../lib/speicher-kategorie.ts";

const K = (id: string, name: string, type: number, position: number, parent_id: string | null = null) => ({ id, name, type, position, parent_id });

test("Genau die sieben Merkzettel, nicht #posteingang, #luca, #akademie-verwaltung", () => {
  assert.deepEqual([...SPEICHER_KANAELE].sort(), ["akademie-speicher", "kunden-stand", "lead-speicher", "lead-suche-speicher", "mail-faeden", "recherche-speicher", "team-register"]);
  for (const n of ["posteingang", "luca", "akademie-verwaltung"]) assert.ok(!SPEICHER_KANAELE.includes(n as never), n);
});

test("Plan: Merkzettel in die Kategorie, Kategorie ganz nach unten", () => {
  const kanaele = [
    K("c1", "AUTOMATISCH", 4, 1),
    K("c2", "AKADEMIE", 4, 5),
    K("sp", "🗄️ SPEICHER", 4, 3),
    K("t1", "lead-speicher", 0, 4, "c1"),
    K("t2", "mail-faeden", 0, 2, "c2"),
    K("t3", "team-register", 0, 1, "sp"),
    K("t4", "posteingang", 0, 0, "c1"),
    K("v1", "lead-speicher", 2, 0, "c1"),
  ];
  const p = speicherPlan(kanaele, "sp");
  assert.deepEqual(p.verschieben, ["t1", "t2"], "nur Textkanäle, die noch nicht drin sind");
  assert.equal(p.position, 6, "hinter die letzte Kategorie");
});

test("Schon alles richtig: nichts zu tun", () => {
  const p = speicherPlan([K("c1", "AUTOMATISCH", 4, 1), K("sp", "🗄️ SPEICHER", 4, 9), K("t3", "team-register", 0, 1, "sp")], "sp");
  assert.deepEqual(p.verschieben, []);
  assert.equal(p.position, null);
});
