// Verloren-Automat B1 (16.11.2026, Davids Fassung): Knöpfe der Verloren-Karte in #posteingang (nur David).
//   vl:start             → sucht frisch, schaltet ab (Vercel pausieren, Stripe deaktivieren, GitHub archivieren)
//   vl:nichts            → Karte schließen, nichts passiert
//   vl:zurueck           → schaltet wieder an, was der Bot abgeschaltet hat
//   vl:zurueckvon:<id>   → dasselbe von der Frage nach „Wieder aufnehmen“ aus (Karte <id> im selben Kanal)
// Regeln und Karte: lib/verloren-regeln.ts, Netz: lib/verloren.ts.
import { after, NextResponse } from "next/server";
import type { AnfInteraction } from "@/lib/anfrage-handlers";
import type { EmbedLike } from "@/lib/discord-calls";
import { aendereKarte, call, posteingangKanal, postKarte, setzeAntwort } from "@/lib/leads";
import { listMessages } from "@/lib/discord";
import { seitenId } from "@/lib/notion-api";
import { DAVID_ID } from "@/lib/team";
import { holeZurueck, liesVerlorenKunde, schalteAb, sucheAlles } from "@/lib/verloren";
import { kopfAus, leseMerker, merkerText, verlorenKarte, type Merker } from "@/lib/verloren-regeln";

const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const heuteDe = () => new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });

/** Nach ⚪ Verloren an der Kundenkarte: Karte in #posteingang (noch nichts abgeschaltet). Fehler stören den Ablauf nie. */
export async function meldeVerloren(token: string, k: { nr: string; seite: string; grund: string; von: string }): Promise<void> {
  try {
    const seite = seitenId(k.seite);
    const kunde = seite ? await liesVerlorenKunde(seite, k.nr) : null;
    const kanal = await posteingangKanal(token);
    if (!kunde || !seite || !kanal) return console.error(`[verloren] Karte für ${k.nr} nicht möglich (Notion oder Kanal fehlt)`);
    const f = await sucheAlles(kunde);
    const { embed, components } = verlorenKarte({ nr: k.nr, name: kunde.name, grund: k.grund, von: k.von }, f, { nr: k.nr, seite, zustand: "offen" });
    await postKarte(token, kanal, embed, components);
  } catch (err) {
    console.error("[verloren] meldeVerloren:", err);
  }
}

/** Nach ↩️ Wieder aufnehmen: Wurde für den Kunden abgeschaltet, fragt eine kurze Nachricht in #posteingang, ob alles zurück soll. */
export async function meldeWiederAufgenommen(token: string, nr: string): Promise<void> {
  try {
    const kanal = await posteingangKanal(token);
    if (!kanal) return;
    const karte = (await listMessages(token, kanal, 100)).find((m) => {
      const mk = leseMerker(m.embeds?.[0]?.footer?.text);
      return mk?.nr === nr && mk.zustand === "gestartet";
    });
    if (!karte) return;
    await call(token, "POST", `/channels/${kanal}/messages`, {
      content: `↩️ **${nr} wurde wieder aufgenommen.** Soll ich zurückholen, was beim Verloren abgeschaltet wurde?`,
      components: [{ type: 1, components: [{ type: 2, style: 3, label: "↩️ Alles zurück", custom_id: `vl:zurueckvon:${karte.id}` }] }],
      allowed_mentions: { parse: [] },
    });
  } catch (err) {
    console.error("[verloren] meldeWiederAufgenommen:", err);
  }
}

async function holeNachricht(token: string, kanal: string, id: string): Promise<EmbedLike | null> {
  const m = await call<{ embeds?: EmbedLike[] }>(token, "GET", `/channels/${kanal}/messages/${id}`);
  return m?.embeds?.[0] ?? null;
}

/** Schaltet zurück und zeichnet die Karte neu (frisch gesucht, damit der Stand stimmt). */
async function zurueck(token: string, kanal: string, kartenId: string, e: EmbedLike, m: Merker): Promise<string> {
  const kopf = kopfAus(e);
  if (!kopf) return "Die Karte lässt sich nicht lesen.";
  const ergebnisse = await holeZurueck(m);
  const kunde = await liesVerlorenKunde(m.seite, m.nr);
  const f = kunde ? await sucheAlles(kunde) : { vercel: null, github: null, link: null, promo: null, laufend: [], vertrag: null, hinweise: ["Notion war nicht lesbar."] };
  const { embed, components } = verlorenKarte({ nr: m.nr, ...kopf }, f, { nr: m.nr, seite: m.seite, zustand: "zurueck" }, ergebnisse);
  await aendereKarte(token, kanal, kartenId, embed, components);
  const fehler = Object.values(ergebnisse).filter((x) => x?.startsWith("⚠️")).length;
  return fehler ? `↩️ Zurückgeholt, aber ${fehler} Teil(e) gingen nicht. Siehe Karte.` : "↩️ Alles wieder angeschaltet.";
}

export function handleVerloren(i: AnfInteraction, token: string | undefined) {
  const user = i.member?.user;
  const id = (i.data?.custom_id ?? "").slice("vl:".length);
  if (!user || !token || !i.channel_id || !i.application_id || !i.token || !i.message) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");
  if (user.id !== DAVID_ID) return ephemeral("Das geht nur für David.");
  const kanal = i.channel_id;
  const nachricht = i.message;
  const antwort = (t: string) => setzeAntwort(i.application_id!, i.token!, t);

  if (id.startsWith("zurueckvon:")) {
    const kartenId = id.slice("zurueckvon:".length);
    after(async () => {
      const e = await holeNachricht(token, kanal, kartenId);
      const m = leseMerker(e?.footer?.text);
      if (!e || !m || m.zustand !== "gestartet") return void (await antwort("Da ist nichts mehr zurückzuholen."));
      const text = await zurueck(token, kanal, kartenId, e, m);
      await call(token, "PATCH", `/channels/${kanal}/messages/${nachricht.id}`, { content: `${text} (${m.nr})`, components: [] });
      await antwort(text);
    });
    return NextResponse.json({ type: 5, data: { flags: 64 } });
  }

  const e = nachricht.embeds?.[0];
  const m = leseMerker(e?.footer?.text);
  const kopf = kopfAus(e);
  if (!e || !m || !kopf) return ephemeral("Diese Karte lässt sich nicht lesen.");

  if (id === "nichts") {
    if (m.zustand !== "offen") return ephemeral("Diese Karte ist schon erledigt.");
    const neu: EmbedLike = {
      ...e,
      color: 0x6b7280,
      description: `${(e.description ?? "").split("\n")[0]}\nNichts abgeschaltet (so gewollt).`,
      footer: { text: merkerText({ ...m, zustand: "nichts" }) },
    };
    after(async () => {
      await aendereKarte(token, kanal, nachricht.id, neu, []);
      await antwort("Gut, es bleibt alles an.");
    });
    return NextResponse.json({ type: 5, data: { flags: 64 } });
  }

  if (id === "start") {
    if (m.zustand !== "offen") return ephemeral("Diese Karte ist schon erledigt.");
    after(async () => {
      // Knöpfe sofort weg, damit niemand doppelt startet.
      await aendereKarte(token, kanal, nachricht.id, { ...e, description: `${(e.description ?? "").split("\n")[0]}\n⏳ Wird abgeschaltet …` }, []);
      const kunde = await liesVerlorenKunde(m.seite, m.nr);
      if (!kunde) {
        await aendereKarte(token, kanal, nachricht.id, e, verlorenKarte({ nr: m.nr, ...kopf }, { vercel: null, github: null, link: null, promo: null, laufend: [], vertrag: null, hinweise: [] }, m).components);
        return void (await antwort("⚠️ Notion war gerade nicht lesbar. Es ist nichts abgeschaltet, bitte gleich nochmal starten."));
      }
      const f = await sucheAlles(kunde);
      const { ergebnisse, abgeschaltet } = await schalteAb(f, heuteDe());
      const nach = await sucheAlles(kunde);
      const { embed, components } = verlorenKarte({ nr: m.nr, ...kopf }, nach, { nr: m.nr, seite: m.seite, zustand: "gestartet", ...abgeschaltet }, ergebnisse);
      await aendereKarte(token, kanal, nachricht.id, embed, components);
      const fehler = Object.values(ergebnisse).filter((x) => x?.startsWith("⚠️ ging")).length;
      const teile = Object.keys(abgeschaltet).length;
      await antwort(fehler ? `▶️ ${teile} Teil(e) abgeschaltet, ${fehler} gingen nicht. Siehe Karte.` : teile ? `▶️ ${teile} Teil(e) abgeschaltet. Mit „↩️ Alles zurück“ holst du es wieder.` : "Es war nichts mehr an.");
    });
    return NextResponse.json({ type: 5, data: { flags: 64 } });
  }

  if (id === "zurueck") {
    if (m.zustand !== "gestartet") return ephemeral("Da ist nichts zurückzuholen.");
    after(async () => {
      await aendereKarte(token, kanal, nachricht.id, { ...e, description: `${(e.description ?? "").split("\n")[0]}\n⏳ Wird zurückgeholt …` }, []);
      await antwort(await zurueck(token, kanal, nachricht.id, e, m));
    });
    return NextResponse.json({ type: 5, data: { flags: 64 } });
  }

  return ephemeral("Unbekannter Knopf.");
}
