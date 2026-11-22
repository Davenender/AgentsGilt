# Akademie-Lesesperre Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** „Weiter ▶“ und „✅ Gelesen“ im Lernpfad gehen erst nach einer kurzen Lesezeit je Seite, ohne den Fortschritt zu ändern.

**Architecture:** Reine Logik in `lib/akademie.ts` (Sperrzeit, Blättern, Gelesen-Prüfung, Knopf-Lesen, Ansicht). Der Lesestand (weiteste Seite `f`, Zeit `t`) steckt in der `custom_id` der Knöpfe; `lib/akademie-handler.ts` liest ihn und entscheidet. Kein neuer Merkzettel-Eintrag.

**Tech Stack:** Next.js 16 / TypeScript, Discord-Interaktionen, Tests mit `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-22-akademie-lesesperre-design.md`

## Global Constraints

- Sperre = `min(grund − 20, grund × 0,6)` mit `grund = Wörter / 300 × 60` s; mindestens 5 s, höchstens 180 s.
- Gilt für alle (auch David). Nur Lernen-Ansicht; Nachlesen (`ak:z:`), Bibliothek, Wiederholen, Tests ohne Sperre.
- Alte Knöpfe ohne Zeit: keine Sperre, kein Fehler.
- Merkzettel unverändert: keine neue Zeilenart, nichts löschen.
- `custom_id` ≤ 100 Zeichen. UI-Texte höchstens ein kurzer Satz. Keine neuen npm-Pakete. Keine Teamnamen.

## Review Focus

- Lektion offen beim Deploy (alter Knopf `ak:s:<id>:<n>` / `ak:g:<id>`) → geht wie bisher.
- Doppelklick oder alter Knopf einer früheren Seite (`ziel > f + 1`) → höchstens eine Seite vor.
- Lektion in Notion inzwischen kürzer (`f` hinter der letzten Seite) → auf letzte Seite begrenzt, kein Absturz.
- Zurück und wieder vor auf gesehene Seiten → kein Warten.
- Echte Notion-ID (36 Zeichen) mit großer Seitenzahl und Zeit → `custom_id` ≤ 100.

---

### Task 1: Logik der Sperre in `lib/akademie.ts`

**Files:**
- Modify: `lib/akademie.ts` (bei `lektionsAnsicht`)
- Test: `tests/akademie.test.ts`

**Interfaces (Produces):**
- `type Lesestand = { f: number; t: number }` (t = Unix-Sekunden)
- `sperrSekunden(seite: string): number`
- `freiAb(seiten: string[], s: Lesestand): number`
- `blaettern(seiten: string[], ziel: number, alt: Lesestand | null, jetzt: number): { seite: number; stand: Lesestand; zuFrueh: boolean }`
- `gelesenPruefen(seiten: string[], alt: Lesestand | null, jetzt: number): { ok: true } | { ok: false; seite: number; stand: Lesestand }`
- `leseKnopf(id: string): { lid: string; ziel: number; stand: Lesestand | null }` für `s:<lid>:<n>[:<f>:<t>]`
- `gelesenKnopf(id: string): { lid: string; stand: Lesestand | null }` für `g:<lid>[:<f>:<t>]`
- `lektionsAnsicht(..., modus, sperre?: { stand: Lesestand; jetzt: number; zuFrueh?: boolean })`: mit `sperre` Knöpfe `ak:s:<lid>:<n>:<f>:<t>` / `ak:g:<lid>:<f>:<t>`, auf Seite `f` vor Ablauf `content` mit `<t:freiAb:R>`; ohne `sperre` alles wie bisher.

- [ ] Tests schreiben: Sperrzeiten (500 Wörter → 60, 200 → 20, 10 → 5, 2000 → 180, Satzzeichen zählen nicht), Blättern (zu früh, nach Ablauf, zurück, ein Schritt höchstens, ohne Stand, Seite außerhalb), Gelesen (zu früh, ok, ohne Stand, nicht auf letzter Seite), Knöpfe lesen (alt + neu), Ansicht (IDs, Countdown nur auf Seite f vor Ablauf, Hinweis „zu früh“, Länge ≤ 100).
- [ ] `npm test` → rot (Funktionen fehlen).
- [ ] Umsetzen.
- [ ] `npm test` → grün.
- [ ] Commit.

### Task 2: Handler und Anleitung

**Files:**
- Modify: `lib/akademie-handler.ts` (`weiter`, `s:`, `g:`)
- Modify: `lib/akademie-daten.ts` (`START_TEXT`, Punkt 3)

**Interfaces (Consumes):** alles aus Task 1.

- [ ] `weiter`: Seite 1 mit `{ stand: { f: 0, t: jetzt }, jetzt }`.
- [ ] `s:`: `leseKnopf` → `blaettern` → Ansicht mit `sperre` (`zuFrueh` durchreichen). `z:` unverändert.
- [ ] `g:`: `gelesenKnopf`; ist die Lektion noch nicht gelesen und hat der Knopf einen Stand → `holeSeiten` + `gelesenPruefen`; nicht ok → gleiche Seite mit `zuFrueh: true`, nichts merken.
- [ ] `START_TEXT` Punkt 3: ein Satz zur kurzen Lesezeit.
- [ ] `npx tsc --noEmit` und `npm test` → grün; `npx eslint` auf die drei Dateien ohne neue Fehler.
- [ ] Commit (nur lokal; Push erst nach Davids Ja).
