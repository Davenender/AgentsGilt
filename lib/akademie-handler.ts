import { after, NextResponse } from "next/server";
import { call } from "@/lib/leads";
import {
  auswertung,
  ergebnisAnsicht,
  fortschritt,
  frageAnsicht,
  gelesenAnsicht,
  lektionAuswahl,
  lektionsAnsicht,
  personDetail,
  schrittLabel,
  standSchritte,
  SUCH_MODAL,
  sucheTreffer,
  zeileGelesen,
  zeileTest,
  type Person,
} from "@/lib/akademie";
import {
  gelesenVon,
  holeInhalt,
  holeSeiten,
  holeText,
  leseAkademie,
  merke,
  nameVon,
  raeumeBibliothekAuf,
  schritteVon,
  zeichne,
  zeichneVerwaltung,
  type Inhalt,
} from "@/lib/akademie-daten";
import { CHEF_ID, TEAM } from "@/lib/zustaendige";

// Knöpfe der Akademie (ak:).
//   Lernpfad: ak:weiter, ak:s (blättern), ak:g (gelesen), ak:z (nachlesen), ak:t (Test). Lektionen und Tests sieht nur die Person.
//   Bibliothek: ak:bw (anzeigen), ak:be (Einheit), ak:b (blättern), ak:bx (schließen), ak:bs/ak:bsuche (suchen).
//   Verwaltung (nur David): ak:vp (Person), ak:vr (aktualisieren).

interface AkInteraction {
  type: number;
  token?: string;
  application_id?: string;
  channel_id?: string;
  data?: { custom_id?: string; values?: string[]; components?: { components?: { custom_id: string; value?: string }[] }[] };
  member?: { user?: { id: string } };
  message?: { id: string };
}

const API = "https://discord.com/api/v10";
const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const DEFER_PRIVAT = { type: 5, data: { flags: 64 } };
const DEFER_UPDATE = { type: 6 };
const FEHLER = { content: "⚠️ Die Akademie ist gerade nicht erreichbar. Bitte gleich nochmal versuchen.", embeds: [], components: [] };

/** Nachricht dieser Interaktion ersetzen (die private Antwort oder die Nachricht mit dem Knopf). */
async function ersetze(appId: string, itoken: string, body: Record<string, unknown>) {
  await fetch(`${API}/webhooks/${appId}/${itoken}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "", embeds: [], components: [], ...body, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
}

async function privat(appId: string, itoken: string, content: string) {
  await fetch(`${API}/webhooks/${appId}/${itoken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, flags: 64, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
}

/** Wem gehört dieser Kanal (Lernpfad oder Bibliothek)? */
function besitzer(personen: Map<string, Person>, kanal: string, art: "lernpfad" | "bibliothek"): [string, Person] | null {
  for (const e of personen) if (e[1][art] === kanal) return e;
  return null;
}

/** Nach jedem Schritt: Karten der Person und Davids Übersicht neu. */
async function nachher(token: string, userId: string, p: Person, personen: Map<string, Person>, inhalt: Inhalt) {
  await zeichne(token, userId, p, inhalt);
  await zeichneVerwaltung(token, personen, inhalt);
}

export function handleAkademie(i: AkInteraction, token: string | undefined) {
  const user = i.member?.user;
  const kanal = i.channel_id;
  const appId = i.application_id;
  const itoken = i.token;
  const id = (i.data?.custom_id ?? "").slice("ak:".length);
  if (!user || !token || !kanal || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");

  /** Lernpfad-Aktionen gehen nur im eigenen Lernpfad. */
  const imLernpfad = async (weiter: (ak: NonNullable<Awaited<ReturnType<typeof leseAkademie>>>, inhalt: Inhalt, p: Person) => Promise<void>) => {
    const [ak, inhalt] = await Promise.all([leseAkademie(token), holeInhalt()]);
    const b = ak && besitzer(ak.personen, kanal, "lernpfad");
    if (!ak || !inhalt || !b) return void (await ersetze(appId, itoken, FEHLER));
    if (b[0] !== user.id) {
      return void (await ersetze(appId, itoken, { content: `Das ist der Lernpfad von ${nameVon(b[0])}. Lernen kann hier nur ${nameVon(b[0])}${user.id === CHEF_ID ? ", den Fortschritt siehst du in #akademie-verwaltung" : ""}.` }));
    }
    await weiter(ak, inhalt, b[1]);
  };

  // ---------------------------------------------------------------- Lernpfad

  // 📖 Weiterlernen: die nächste Lektion oder der Test, nur für die Person sichtbar
  if (id === "weiter") {
    after(() =>
      imLernpfad(async (_ak, inhalt, p) => {
        const s = standSchritte(schritteVon(p, inhalt), p.gelesen, p.bestanden).aktuelle;
        if (!s) return void (await ersetze(appId, itoken, { content: "🎉 Alles geschafft, was gerade frei ist. Neue Lektionen kommen hier dazu." }));
        if (s.art === "test") return void (await ersetze(appId, itoken, frageAnsicht(s.einheitName, s.fragen, "")));
        const seiten = await holeSeiten(s.lektion);
        if (!seiten) return void (await ersetze(appId, itoken, FEHLER));
        await ersetze(appId, itoken, lektionsAnsicht(s.lektion, seiten, 0, !s.lektion.freigegeben));
      }),
    );
    // Aus einer privaten Antwort heraus (Knopf nach „Gelesen“ oder Test) wird diese ersetzt, sonst kommt eine neue.
    return NextResponse.json(i.message && isPrivat(i) ? DEFER_UPDATE : DEFER_PRIVAT);
  }

  // Blättern (lernen) und Nachlesen
  if (id.startsWith("s:") || id.startsWith("z:")) {
    const modus = id.startsWith("s:") ? "lernen" : "lesen";
    const [lid, nr] = id.slice(2).split(":");
    after(async () => {
      const inhalt = await holeInhalt();
      const l = inhalt?.lektionen.find((x) => x.id === lid);
      const seiten = l ? await holeSeiten(l) : null;
      if (!l || !seiten) return void (await ersetze(appId, itoken, FEHLER));
      await ersetze(appId, itoken, lektionsAnsicht(l, seiten, Math.min(Math.max(0, Number(nr) || 0), seiten.length - 1), !l.freigegeben, modus));
    });
    return NextResponse.json(DEFER_UPDATE);
  }

  // ✅ Gelesen: abhaken, private Lektion verschwindet, Karten neu
  if (id.startsWith("g:")) {
    const lid = id.slice(2);
    after(() =>
      imLernpfad(async (ak, inhalt, p) => {
        const sch = schritteVon(p, inhalt);
        const st = standSchritte(sch, p.gelesen, p.bestanden);
        const l = inhalt.lektionen.find((x) => x.id === lid);
        if (!l) return void (await ersetze(appId, itoken, FEHLER));
        if (!p.gelesen.has(l.id)) {
          if (st.aktuelle?.art !== "lektion" || st.aktuelle.lektion.id !== l.id) {
            return void (await ersetze(appId, itoken, { content: "Diese Lektion ist noch gesperrt. Mach erst die vorigen Schritte." }));
          }
          const zeit = new Date().toISOString();
          await merke(token, ak.speicher, zeileGelesen(user.id, l.id, l.nr, zeit));
          p.gelesen.set(l.id, { nr: l.nr, zeit });
        }
        await ersetze(appId, itoken, gelesenAnsicht(l, schrittLabel(standSchritte(sch, p.gelesen, p.bestanden).aktuelle)));
        await nachher(token, user.id, p, ak.personen, inhalt);
      }),
    );
    return NextResponse.json(DEFER_UPDATE);
  }

  // 📝 Test: Antworten stecken im Knopf, am Ende Auswertung
  if (id.startsWith("t:")) {
    const [einheitText, antworten = ""] = id.slice(2).split(":");
    const einheit = Number(einheitText);
    after(() =>
      imLernpfad(async (ak, inhalt, p) => {
        const test = schritteVon(p, inhalt).find((s) => s.art === "test" && s.einheit === einheit);
        if (!test || test.art !== "test") return void (await ersetze(appId, itoken, { content: "Diesen Test gibt es nicht (mehr)." }));
        if (antworten.length < test.fragen.length) return void (await ersetze(appId, itoken, frageAnsicht(test.einheitName, test.fragen, antworten)));
        const a = auswertung(test.fragen, antworten);
        const zeit = new Date().toISOString();
        await merke(token, ak.speicher, zeileTest(user.id, einheit, a.richtig, a.gesamt, a.bestanden, zeit));
        p.tests.push({ einheit, richtig: a.richtig, gesamt: a.gesamt, bestanden: a.bestanden, zeit });
        if (a.bestanden) p.bestanden.add(einheit);
        await ersetze(appId, itoken, ergebnisAnsicht(a, inhalt.lektionen, einheit));
        await nachher(token, user.id, p, ak.personen, inhalt);
      }),
    );
    return NextResponse.json(isPrivat(i) ? DEFER_UPDATE : DEFER_PRIVAT);
  }

  // -------------------------------------------------------------- Bibliothek

  // Lektion anzeigen: für alle im Kanal, ältere Anzeigen verschwinden
  if (id === "bw") {
    const lid = i.data?.values?.[0] ?? "";
    after(async () => {
      const [ak, inhalt] = await Promise.all([leseAkademie(token), holeInhalt()]);
      const b = ak && besitzer(ak.personen, kanal, "bibliothek");
      const l = inhalt?.lektionen.find((x) => x.id === lid);
      if (!b || !inhalt || !l || !b[1].gelesen.has(l.id)) return void (await privat(appId, itoken, "Diese Lektion ist (noch) nicht in der Bibliothek."));
      const seiten = await holeSeiten(l);
      if (!seiten) return void (await privat(appId, itoken, FEHLER.content));
      const m = await call<{ id: string }>(token, "POST", `/channels/${kanal}/messages`, { ...lektionsAnsicht(l, seiten, 0, false, "bib"), allowed_mentions: { parse: [] } });
      await raeumeBibliothekAuf(token, { kanal, ausser: m?.id });
    });
    return NextResponse.json(DEFER_UPDATE);
  }

  // Einheit gewählt (bei mehr als 25 Lektionen): Auswahl der Lektionen nur für die Person
  if (id === "be") {
    const einheit = Number(i.data?.values?.[0]);
    after(async () => {
      const [ak, inhalt] = await Promise.all([leseAkademie(token), holeInhalt()]);
      const b = ak && besitzer(ak.personen, kanal, "bibliothek");
      if (!b || !inhalt) return void (await ersetze(appId, itoken, FEHLER));
      const liste = gelesenVon(b[1], inhalt).filter((l) => l.einheit === einheit);
      await ersetze(appId, itoken, { content: "Welche Lektion?", components: lektionAuswahl(liste) });
    });
    return NextResponse.json(DEFER_PRIVAT);
  }

  // Blättern und Schließen in einer Anzeige
  if (id.startsWith("b:")) {
    const [lid, nr] = id.slice(2).split(":");
    const msg = i.message?.id;
    after(async () => {
      const l = (await holeInhalt())?.lektionen.find((x) => x.id === lid);
      const seiten = l ? await holeSeiten(l) : null;
      if (!l || !seiten || !msg) return;
      await call(token, "PATCH", `/channels/${kanal}/messages/${msg}`, { ...lektionsAnsicht(l, seiten, Math.min(Math.max(0, Number(nr) || 0), seiten.length - 1), false, "bib"), allowed_mentions: { parse: [] } });
    });
    return NextResponse.json(DEFER_UPDATE);
  }
  if (id === "bx") {
    const msg = i.message?.id;
    if (msg) after(async () => void (await call(token, "DELETE", `/channels/${kanal}/messages/${msg}`)));
    return NextResponse.json(DEFER_UPDATE);
  }

  // 🔎 Suchen
  if (id === "bs") return NextResponse.json(SUCH_MODAL);
  if (id === "bsuche") {
    const begriff = (i.data?.components ?? []).flatMap((r) => r.components ?? []).find((c) => c.custom_id === "begriff")?.value?.trim() ?? "";
    after(async () => {
      const [ak, inhalt] = await Promise.all([leseAkademie(token), holeInhalt()]);
      const b = ak && besitzer(ak.personen, kanal, "bibliothek");
      if (!b || !inhalt) return void (await ersetze(appId, itoken, FEHLER));
      const gelesen = gelesenVon(b[1], inhalt);
      // Höchstens drei Notion-Abfragen gleichzeitig (Notion bremst sonst).
      const liste: { lektion: (typeof gelesen)[number]; text: string }[] = [];
      for (let k = 0; k < gelesen.length; k += 3) {
        const teil = await Promise.all(gelesen.slice(k, k + 3).map(async (l) => ({ lektion: l, text: (await holeText(l)) ?? "" })));
        liste.push(...teil);
      }
      const treffer = sucheTreffer(liste, begriff);
      if (!treffer.length) return void (await ersetze(appId, itoken, { content: `🔎 Zu „${begriff}“ steht nichts in deinen gelesenen Lektionen.` }));
      await ersetze(appId, itoken, {
        content: `🔎 **${treffer.length} Treffer zu „${begriff}“**\n${treffer.slice(0, 10).map((t) => `• **${t.lektion.nr} ${t.lektion.titel}**: ${t.ausschnitt}`).join("\n")}`.slice(0, 1900),
        components: lektionAuswahl(treffer.map((t) => t.lektion), "Treffer anzeigen …"),
      });
    });
    return NextResponse.json(DEFER_PRIVAT);
  }

  // ------------------------------------------------------- Verwaltung (David)

  if (id === "vr" || id.startsWith("vp:")) {
    if (user.id !== CHEF_ID) return ephemeral("Das sieht nur David.");
    const ziel = id.startsWith("vp:") ? id.slice(3) : null;
    after(async () => {
      const [ak, inhalt] = await Promise.all([leseAkademie(token), holeInhalt()]);
      if (!ak || !inhalt) return void (await ersetze(appId, itoken, FEHLER));
      if (!ziel) return void (await zeichneVerwaltung(token, ak.personen, inhalt));
      const p = ak.personen.get(ziel);
      if (!p) return void (await ersetze(appId, itoken, { content: "Diese Person hat noch keinen Bereich." }));
      const name = TEAM.find((t) => t.discord === ziel)?.name ?? "Person";
      const sch = schritteVon(p, inhalt);
      await ersetze(appId, itoken, { embeds: [personDetail(fortschritt(name, p, sch), p, sch)] });
    });
    return NextResponse.json(ziel ? DEFER_PRIVAT : DEFER_UPDATE);
  }

  return NextResponse.json({ ok: true });
}

/** Kam der Klick aus einer Nachricht, die nur die Person sieht? */
function isPrivat(i: AkInteraction): boolean {
  return Boolean(((i.message as { flags?: number } | undefined)?.flags ?? 0) & 64);
}

