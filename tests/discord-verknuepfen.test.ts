// Davids Wunsch 26.11.2026: Agents-Gilt-Logo mit „Agents Gilt · Founder“ unter „Verknüpfungen“ im Discord-Profil (Linked Roles).
import assert from "node:assert/strict";
import { test } from "node:test";
import { anmeldeUrl, antwortSeite, DAVID_DISCORD_ID, rollenVerbindung, RUECKRUF, statePasst } from "../lib/discord-verknuepfen.ts";

test("Anmelde-Adresse: richtige Rechte, Rückruf und state", () => {
  const u = new URL(anmeldeUrl({ clientId: "42", state: "abcdef0123456789" }));
  assert.equal(u.origin + u.pathname, "https://discord.com/oauth2/authorize");
  assert.equal(u.searchParams.get("client_id"), "42");
  assert.equal(u.searchParams.get("redirect_uri"), RUECKRUF);
  assert.equal(u.searchParams.get("scope"), "role_connections.write identify");
  assert.equal(u.searchParams.get("state"), "abcdef0123456789");
  assert.equal(u.searchParams.get("response_type"), "code");
});

test("nur David bekommt die Verbindung „Agents Gilt · Founder“", () => {
  assert.deepEqual(rollenVerbindung(DAVID_DISCORD_ID), { platform_name: "Agents Gilt", platform_username: "Agents Gilt · Founder", metadata: { founder: "1" } });
  assert.equal(rollenVerbindung("123"), null);
});

test("state muss zum Cookie passen", () => {
  assert.equal(statePasst("abcdef0123456789", "abcdef0123456789"), true);
  assert.equal(statePasst("abcdef0123456789", "abcdef012345678X"), false);
  assert.equal(statePasst(undefined, "abcdef0123456789"), false);
  assert.equal(statePasst("kurz", "kurz"), false);
});

test("Antwortseite maskiert Text", () => {
  assert.match(antwortSeite("Verknüpft", "<b>"), /&lt;b&gt;/);
});
