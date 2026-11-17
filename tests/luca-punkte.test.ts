import { test } from "node:test";
import assert from "node:assert/strict";
import { briefAus, briefLesen, briefText, LUCA_WERKZEUGE } from "../lib/luca-logik.ts";

// Punkt 6, Etappe 5 (17.11.2026): Davids Wunsch – auch am Telefon kann Luca einen von Davids offenen Punkten abhaken
// („das mit GitHub ist erledigt“). Der Brief geht wie die anderen Selbst-Werkzeuge an die Zentrale.
test("punkt_erledigt: Werkzeug für Luca, Brief an die Zentrale", () => {
  const b = briefAus("punkt_erledigt", { punkt: "GitHub privat" });
  assert.deepEqual(b && { typ: b.typ, was: (b as { was?: string }).was, text: (b as { text?: string }).text }, { typ: "selbst", was: "punkt_erledigt", text: "GitHub privat" });
  assert.equal(briefAus("punkt_erledigt", { punkt: "" }), null);
  assert.equal(briefLesen(briefText({ ...b!, zeit: "2026-11-17T20:00:00Z" }))?.typ, "selbst");
  const w = LUCA_WERKZEUGE.find((x) => x.function.name === "punkt_erledigt");
  assert.ok(w, "Werkzeug fehlt");
  assert.deepEqual(w.function.parameters.required, ["punkt"]);
});
