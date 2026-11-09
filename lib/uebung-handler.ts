import Anthropic from "@anthropic-ai/sdk";
import { after, NextResponse } from "next/server";
import { alleNachrichten, call } from "@/lib/leads";
import { lektionText, pfadLektionen, zeileUebung, type Person } from "@/lib/akademie";
import { holeInhalt, leseAkademie, merke, nameVon, zeichneUebung, zeichneVerwaltung, type Inhalt } from "@/lib/akademie-daten";
import { guthabenLeer } from "@/lib/gespraech";
import { leseBloecke } from "@/lib/notion-api";
import {
  abbruchEmbed,
  ANTWORT_MODAL,
  apiNachrichten,
  aktuelleUebung,
  BEWERTUNG_PROMPT,
  darfUeben,
  ergebnisEmbed,
  GRENZE_TAG,
  GRENZE_ZUEGE,
  heuteGestartet,
  KUNDEN_PROMPT,
  lagenAuswahl,
  pruefeBewertung,
  sichtbareUebungen,
  START_KNOPF,
  startEmbed,
  transkript,
  uebungTeile,
  verlauf,
  zugEmbed,
  zugKnoepfe,
} from "@/lib/uebung";

// Knöpfe der Übungen (ak:u…), nur im eigenen Übungskanal:
//   ak:us        🎭 Übung starten → Auswahl der Lagen (nur für die Person)
//   ak:uw        Lage gewählt → Aufgabe und erster Satz des Kunden im Kanal
//   ak:ua:<s>    💬 Antworten → Fenster;  ak:um:<s> Fenster abgeschickt → KI antwortet als Kunde
//   ak:uf:<s>    ✅ Fertig → Bewertung mit Punkten;  ak:ux:<s> ✖️ Abbrechen
// Die KI läuft über das Anthropic-Guthaben (Haiku). Ist es leer, sagt der Bot das freundlich.

export interface UeInteraction {
  token?: string;
  application_id?: string;
  channel_id?: string;
  data?: { custom_id?: string; values?: string[]; components?: { components?: { custom_id: string; value?: string }[] }[] };
  member?: { user?: { id: string } };
  message?: { id: string; flags?: number };
}

const API = "https://discord.com/api/v10";
const MODELL = "claude-haiku-5-5";
const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const DEFER_PRIVAT = { type: 5, data: { flags: 64 } };
const DEFER_UPDATE = { type: 6 };
const NICHT_DA = "⚠️ Die Übungen sind gerade nicht erreichbar. Bitte gleich nochmal versuchen.";
const LEER = "Die KI ist gerade nicht erreichbar: Das KI-Guthaben ist leer. Sobald es wieder aufgeladen ist, geht es hier weiter. Deine Übung bleibt so stehen.";

async function ersetze(appId: string, itoken: string, body: Record<string, unknown>) {
  await fetch(`${API}/webhooks/${appId}/${itoken}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "", embeds: [], components: [], ...body, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
}

async function loesche(appId: string, itoken: string) {
  await fetch(`${API}/webhooks/${appId}/${itoken}/messages/@original`, { method: "DELETE", signal: AbortSignal.timeout(8000) }).catch(() => {});
}

const poste = (token: string, kanal: string, body: Record<string, unknown>) =>
  call<{ id: string }>(token, "POST", `/channels/${kanal}/messages`, { ...body, allowed_mentions: { parse: [] } });

/** Knöpfe unter einer Kunden-Antwort entfernen (sie gelten nur für die neueste). */
const ohneKnoepfe = (token: string, kanal: string, id: string) => call(token, "PATCH", `/channels/${kanal}/messages/${id}`, { components: [] });

/** Text einer Notion-Seite (null = nicht lesbar). */
async function seitenText(id: string): Promise<string | null> {
  const b = await leseBloecke(id);
  return b ? lektionText(b) : null;
}

/** Fragt die KI. Gibt den Text oder einen Fehlertext für die Person zurück. */
async function frageKi(system: string, messages: { role: "user" | "assistant"; content: string }[], maxTokens: number): Promise<{ text: string } | { fehler: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { fehler: "Die KI ist gerade nicht eingerichtet. Bitte David Bescheid sagen." };
  try {
    const res = await new Anthropic({ apiKey, timeout: 35_000, maxRetries: 1 }).messages.create({
      model: MODELL,
      max_tokens: maxTokens,
      output_config: { effort: "low" },
      system,
      messages,
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text ? { text } : { fehler: "⚠️ Die KI hat nichts geantwortet. Bitte nochmal versuchen." };
  } catch (err) {
    console.error("[übung] KI-Aufruf fehlgeschlagen:", err);
    return { fehler: guthabenLeer(String((err as { message?: string })?.message ?? err)) ? LEER : "⚠️ Die KI hat gerade nicht geantwortet. Bitte gleich nochmal versuchen." };
  }
}

export function handleUebung(i: UeInteraction, token: string, id: string) {
  const user = i.member?.user;
  const kanal = i.channel_id;
  const appId = i.application_id;
  const itoken = i.token;
  if (!user || !kanal || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");
  const [aktion, start = ""] = id.split(":");

  // Das Fenster muss sofort kommen, geprüft wird beim Abschicken.
  if (aktion === "ua") return NextResponse.json(ANTWORT_MODAL(start));

  /** Nur im eigenen Übungskanal. Antwortet selbst, wenn etwas nicht passt. */
  const imKanal = async (weiter: (p: Person, inhalt: Inhalt, personen: Map<string, Person>) => Promise<void>) => {
    const [ak, inhalt] = await Promise.all([leseAkademie(token), holeInhalt()]);
    if (!ak || !inhalt) return void (await ersetze(appId, itoken, { content: NICHT_DA }));
    const eigen = ak.personen.get(user.id);
    if (!eigen?.uebKanal || eigen.uebKanal.kanal !== kanal) {
      const besitzer = [...ak.personen.entries()].find(([, p]) => p.uebKanal?.kanal === kanal)?.[0];
      return void (await ersetze(appId, itoken, { content: besitzer ? `Das sind die Übungen von ${nameVon(besitzer)}. Üben kann hier nur ${nameVon(besitzer)}.` : "Übungen gehen nur im eigenen Übungskanal." }));
    }
    await weiter(eigen, inhalt, ak.personen);
  };

  /** Die laufende Übung zu diesem Knopf (Nachrichten älteste zuerst). */
  const laufend = async (lageVon: Inhalt) => {
    const msgs = (await alleNachrichten(token, kanal, 300)).slice().reverse();
    const v = verlauf(msgs, start);
    if (!v || v.beendet || aktuelleUebung(msgs) !== start) return null;
    const lage = lageVon.uebungen.find((u) => u.nr === v.nr && !u.leitfaden);
    return lage ? { v, lage } : null;
  };

  // 🎭 Übung starten: freie Lagen zur Auswahl
  if (aktion === "us") {
    after(() =>
      imKanal(async (p, inhalt) => {
        const lagen = sichtbareUebungen(inhalt.uebungen, p.rolle);
        const frei = lagen.filter((u) => darfUeben(u, p));
        if (!lagen.length) return void (await ersetze(appId, itoken, { content: "Es sind noch keine Lagen da. Sobald David welche freigibt, stehen sie hier." }));
        if (!frei.length) {
          const ab = Math.min(...lagen.map((u) => u.voraussetzung));
          return void (await ersetze(appId, itoken, { content: `🔒 Die Übungen werden frei, sobald du den Test von Einheit ${ab} bestanden hast. Mach dafür in deinem Lernpfad weiter.` }));
        }
        await ersetze(appId, itoken, { content: "Welche Lage möchtest du üben?", components: lagenAuswahl(frei) });
      }),
    );
    return NextResponse.json(DEFER_PRIVAT);
  }

  // Lage gewählt: Aufgabe und erster Satz des Kunden
  if (aktion === "uw") {
    const lageId = i.data?.values?.[0] ?? "";
    after(() =>
      imKanal(async (p, inhalt) => {
        const lage = sichtbareUebungen(inhalt.uebungen, p.rolle).find((u) => u.id === lageId);
        if (!lage || !darfUeben(lage, p)) return void (await ersetze(appId, itoken, { content: "Diese Lage ist für dich (noch) nicht frei." }));
        const msgs = await alleNachrichten(token, kanal, 300);
        if (p.rolle !== "david" && heuteGestartet(msgs) >= GRENZE_TAG) {
          return void (await ersetze(appId, itoken, { content: `Für heute sind die ${GRENZE_TAG} Übungen geschafft. Morgen geht es weiter.` }));
        }
        const text = await seitenText(lage.id);
        const teile = text === null ? null : uebungTeile(text);
        if (!teile?.rolle || !teile.ersterSatz) return void (await ersetze(appId, itoken, { content: "Diese Lage ist in Notion noch nicht fertig (Rolle oder erster Satz fehlt). Bitte David Bescheid sagen." }));
        // Eine noch laufende Übung endet ohne Bewertung.
        const alt = aktuelleUebung(msgs.slice().reverse());
        const altV = alt ? verlauf(msgs.slice().reverse(), alt) : null;
        if (alt && altV && !altV.beendet) {
          const letzte = altV.zuege.at(-1);
          if (letzte) await ohneKnoepfe(token, kanal, letzte.id);
          await poste(token, kanal, { embeds: [abbruchEmbed(alt)] });
        }
        const name = nameVon(user.id);
        const s = await poste(token, kanal, { embeds: [startEmbed(lage, teile.aufgabe, name)] });
        if (!s) return void (await ersetze(appId, itoken, { content: NICHT_DA }));
        await poste(token, kanal, { embeds: [zugEmbed("kunde", teile.ersterSatz, name, s.id)], components: zugKnoepfe(s.id) });
        await ersetze(appId, itoken, { content: `🎭 Los geht's: „${lage.titel}“ läuft unten im Kanal.` });
      }),
    );
    return NextResponse.json(DEFER_UPDATE);
  }

  // Fenster abgeschickt: KI antwortet als Kunde
  if (aktion === "um") {
    const neu = (i.data?.components ?? []).flatMap((r) => r.components ?? []).find((c) => c.custom_id === "antwort")?.value?.trim() ?? "";
    after(() =>
      imKanal(async (_p, inhalt) => {
        if (!neu) return void (await ersetze(appId, itoken, { content: "Die Antwort war leer." }));
        const l = await laufend(inhalt);
        if (!l) return void (await ersetze(appId, itoken, { content: "Diese Übung ist schon vorbei. Starte oben eine neue." }));
        if (l.v.zuege.filter((z) => z.wer === "du").length >= GRENZE_ZUEGE) {
          return void (await ersetze(appId, itoken, { content: `Diese Übung hat schon ${GRENZE_ZUEGE} Antworten. Drück „✅ Fertig“ für die Bewertung.` }));
        }
        const text = await seitenText(l.lage.id);
        const teile = text === null ? null : uebungTeile(text);
        if (!teile?.rolle) return void (await ersetze(appId, itoken, { content: NICHT_DA }));
        await call(token, "POST", `/channels/${kanal}/typing`);
        const r = await frageKi(KUNDEN_PROMPT.replace("{ROLLE}", teile.rolle), apiNachrichten(l.v.zuege, neu), 600);
        if ("fehler" in r) return void (await ersetze(appId, itoken, { content: `${r.fehler}\n\nDeine Antwort war:\n> ${neu.slice(0, 1500).replace(/\n/g, "\n> ")}` }));
        const name = nameVon(user.id);
        const letzte = l.v.zuege.filter((z) => z.wer === "kunde").at(-1);
        if (letzte) await ohneKnoepfe(token, kanal, letzte.id);
        await poste(token, kanal, { embeds: [zugEmbed("du", neu, name, start)] });
        await poste(token, kanal, { embeds: [zugEmbed("kunde", r.text, name, start)], components: zugKnoepfe(start) });
        await loesche(appId, itoken);
      }),
    );
    return NextResponse.json(DEFER_PRIVAT);
  }

  // ✅ Fertig: Bewertung nach dem Leitfaden
  if (aktion === "uf") {
    after(() =>
      imKanal(async (p, inhalt, personen) => {
        const l = await laufend(inhalt);
        if (!l) return void (await ersetze(appId, itoken, { content: "Diese Übung ist schon vorbei." }));
        if (l.v.zuege.filter((z) => z.wer === "du").length < 2) {
          return void (await ersetze(appId, itoken, { content: "Für eine Bewertung ist das Gespräch noch zu kurz. Antworte noch ein paar Mal oder brich ab." }));
        }
        const leitfadenSeite = inhalt.uebungen.find((u) => u.leitfaden);
        const [lageText, leitfaden] = await Promise.all([seitenText(l.lage.id), leitfadenSeite ? seitenText(leitfadenSeite.id) : Promise.resolve("")]);
        if (lageText === null || leitfaden === null || !leitfaden) return void (await ersetze(appId, itoken, { content: NICHT_DA }));
        const lektionen = pfadLektionen(inhalt.lektionen, p.rolle).map((x) => ({ nr: x.nr, titel: x.titel }));
        const name = nameVon(user.id);
        const system = BEWERTUNG_PROMPT.replace("{LEITFADEN}", leitfaden.slice(0, 12_000))
          .replace("{ACHTEN}", uebungTeile(lageText).achten || "keine besonderen Punkte")
          .replace("{LEKTIONEN}", lektionen.map((x) => `${x.nr} ${x.titel}`).join("\n"));
        await call(token, "POST", `/channels/${kanal}/typing`);
        const r = await frageKi(system, [{ role: "user", content: `<gespraech verkaeufer="${name}">\n${transkript(l.v.zuege, name).slice(0, 30_000)}\n</gespraech>` }], 2000);
        if ("fehler" in r) return void (await ersetze(appId, itoken, { content: r.fehler }));
        let raw: unknown = null;
        const a = r.text.indexOf("{");
        const b = r.text.lastIndexOf("}");
        try {
          if (a !== -1 && b > a) raw = JSON.parse(r.text.slice(a, b + 1));
        } catch {
          raw = null;
        }
        const bewertung = pruefeBewertung(raw, lektionen.map((x) => x.nr));
        if (!bewertung) return void (await ersetze(appId, itoken, { content: "⚠️ Die Bewertung hat nicht geklappt. Bitte nochmal „✅ Fertig“ drücken." }));
        const letzte = l.v.zuege.filter((z) => z.wer === "kunde").at(-1);
        if (letzte) await ohneKnoepfe(token, kanal, letzte.id);
        await poste(token, kanal, { embeds: [ergebnisEmbed(bewertung, l.lage.titel, start, lektionen)], components: [{ type: 1, components: [{ ...START_KNOPF, label: "Neue Übung" }] }] });
        const zeit = new Date().toISOString();
        const ak = await leseAkademie(token);
        if (ak) await merke(token, ak.speicher, zeileUebung(user.id, l.lage.nr, l.lage.titel, bewertung.punkte, zeit));
        (p.uebungen ??= []).push({ nr: l.lage.nr, titel: l.lage.titel, punkte: bewertung.punkte, zeit });
        await zeichneUebung(token, user.id, p, inhalt);
        await zeichneVerwaltung(token, personen, inhalt);
        await loesche(appId, itoken);
      }),
    );
    return NextResponse.json(DEFER_PRIVAT);
  }

  // ✖️ Abbrechen
  if (aktion === "ux") {
    after(() =>
      imKanal(async (_p, inhalt) => {
        const l = await laufend(inhalt);
        if (!l) return void (await ersetze(appId, itoken, { content: "Diese Übung ist schon vorbei." }));
        const letzte = l.v.zuege.filter((z) => z.wer === "kunde").at(-1);
        if (letzte) await ohneKnoepfe(token, kanal, letzte.id);
        await poste(token, kanal, { embeds: [abbruchEmbed(start)], components: [{ type: 1, components: [{ ...START_KNOPF, label: "Neue Übung" }] }] });
        await loesche(appId, itoken);
      }),
    );
    return NextResponse.json(DEFER_PRIVAT);
  }

  return NextResponse.json({ ok: true });
}
