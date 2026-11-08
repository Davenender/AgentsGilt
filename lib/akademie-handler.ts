import { after, NextResponse } from "next/server";
import { messageLink } from "@/lib/discord";
import { call, setzeAntwort } from "@/lib/leads";
import { bibliothekEmbeds, gelesenAnsicht, inhaltsverzeichnis, lektionsAnsicht, pfadKarte, pfadLektionen, stand, zeileBib, zeileGelesen, type Person } from "@/lib/akademie";
import { holeLektionen, holeSeiten, leseAkademie, merke, schalteFrei } from "@/lib/akademie-daten";
import { CHEF_ID, TEAM } from "@/lib/zustaendige";

// Knöpfe der Akademie (ak:). Freischalten macht nur David. Lernen geht im eigenen Lernpfad-Kanal.

interface AkInteraction {
  type: number;
  token?: string;
  application_id?: string;
  channel_id?: string;
  data?: { custom_id?: string; values?: string[]; resolved?: { users?: Record<string, { username?: string; global_name?: string | null }> } };
  member?: { user?: { id: string; username?: string; global_name?: string | null }; nick?: string | null };
  message?: { id: string };
}

const API = "https://discord.com/api/v10";
const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const NUR_DAVID = "Das macht David.";

const nameVon = (id: string, fallback: string) => TEAM.find((t) => t.discord === id)?.name ?? fallback;

/** Antwort auf eine aufgeschobene Interaktion mit Karte und Knöpfen ersetzen. */
async function antwortMit(appId: string, itoken: string, body: Record<string, unknown>) {
  await fetch(`${API}/webhooks/${appId}/${itoken}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
}

/** Wem gehört dieser Lernpfad-Kanal? */
function besitzer(personen: Map<string, Person>, kanal: string): [string, Person] | null {
  for (const e of personen) if (e[1].lernpfad === kanal) return e;
  return null;
}

/** Pfad-Karte und Inhaltsverzeichnis einer Person neu zeichnen. */
async function aktualisiere(token: string, userId: string, p: Person, lektionen: Awaited<ReturnType<typeof holeLektionen>>) {
  if (!lektionen) return;
  const name = nameVon(userId, "dir");
  const pfad = pfadLektionen(lektionen, p.rolle);
  await call(token, "PATCH", `/channels/${p.lernpfad}/messages/${p.pfadMsg}`, { ...pfadKarte(name, pfad, p.gelesen), allowed_mentions: { parse: [] } });
  const eintraege = [...p.bib].flatMap(([id, b]) => {
    const l = lektionen.find((x) => x.id === id);
    return l ? [{ nr: l.nr, titel: l.titel, einheitName: l.einheitName, link: b.link }] : [];
  });
  await call(token, "PATCH", `/channels/${p.bibliothek}/messages/${p.tocMsg}`, { embeds: [inhaltsverzeichnis(name, eintraege)], allowed_mentions: { parse: [] } });
}

export function handleAkademie(i: AkInteraction, token: string | undefined) {
  const user = i.member?.user;
  const kanal = i.channel_id;
  const appId = i.application_id;
  const itoken = i.token;
  const id = (i.data?.custom_id ?? "").slice("ak:".length);
  if (!user || !token || !kanal || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");

  // ---- Freischalten (nur David): Person auswählen
  if (id === "frei") {
    if (user.id !== CHEF_ID) return ephemeral(NUR_DAVID);
    return NextResponse.json({
      type: 4,
      data: {
        flags: 64,
        content: "🔓 **Wen freischalten?** Erst nach der unterschriebenen Vertraulichkeitsvereinbarung.",
        components: [{ type: 1, components: [{ type: 5, custom_id: "ak:freiwahl", placeholder: "Person auswählen", min_values: 1, max_values: 1 }] }],
        allowed_mentions: { parse: [] },
      },
    });
  }
  if (id === "freiwahl" || id === "meins") {
    if (user.id !== CHEF_ID) return ephemeral(NUR_DAVID);
    const ziel = id === "meins" ? user.id : (i.data?.values?.[0] ?? "");
    const r = i.data?.resolved?.users?.[ziel];
    const name = nameVon(ziel, r?.global_name || r?.username || "Person");
    after(async () => {
      const f = await schalteFrei(token, ziel, name);
      if (!f.ok) return void (await setzeAntwort(appId, itoken, `⚠️ ${f.grund}`));
      await setzeAntwort(
        appId,
        itoken,
        `${f.neu ? "✅ Freigeschaltet" : "ℹ️ Schon freigeschaltet"}: **${name}**\n📖 <#${f.person.lernpfad}> · 📚 <#${f.person.bibliothek}>`,
      );
    });
    return id === "meins" ? NextResponse.json({ type: 5, data: { flags: 64 } }) : NextResponse.json({ type: 7, data: { content: "⏳ Wird freigeschaltet …", components: [] } });
  }

  // ---- 📖 Weiterlernen: die aktuelle Lektion, Seite 1
  if (id === "weiter") {
    after(async () => {
      const [ak, lektionen] = await Promise.all([leseAkademie(token), holeLektionen()]);
      const b = ak && besitzer(ak.personen, kanal);
      if (!b || !lektionen) return void (await antwortMit(appId, itoken, { content: "⚠️ Die Akademie ist gerade nicht erreichbar. Bitte gleich nochmal versuchen." }));
      const [, p] = b;
      const s = stand(pfadLektionen(lektionen, p.rolle), p.gelesen);
      if (!s.aktuelle) return void (await antwortMit(appId, itoken, { content: "🎉 Alles gelesen, was gerade frei ist. Neue Lektionen kommen hier dazu." }));
      const seiten = await holeSeiten(s.aktuelle);
      if (!seiten) return void (await antwortMit(appId, itoken, { content: "⚠️ Die Lektion konnte nicht geladen werden. Bitte gleich nochmal versuchen." }));
      await antwortMit(appId, itoken, { content: "", ...lektionsAnsicht(s.aktuelle, seiten, 0, !s.aktuelle.freigegeben) });
    });
    return NextResponse.json({ type: 5 });
  }

  // ---- Blättern
  if (id.startsWith("s:")) {
    const [lid, nr] = id.slice(2).split(":");
    const msg = i.message?.id;
    after(async () => {
      const l = (await holeLektionen())?.find((x) => x.id === lid);
      const seiten = l ? await holeSeiten(l) : null;
      if (!l || !seiten || !msg) return;
      const n = Math.min(Math.max(0, Number(nr) || 0), seiten.length - 1);
      await call(token, "PATCH", `/channels/${kanal}/messages/${msg}`, { content: "", ...lektionsAnsicht(l, seiten, n, !l.freigegeben), allowed_mentions: { parse: [] } });
    });
    return NextResponse.json({ type: 6 });
  }

  // ---- ✅ Gelesen: abhaken, in die Bibliothek, Karten neu
  if (id.startsWith("g:")) {
    const lid = id.slice(2);
    const msg = i.message?.id;
    after(async () => {
      const [ak, lektionen] = await Promise.all([leseAkademie(token), holeLektionen()]);
      const b = ak && besitzer(ak.personen, kanal);
      if (!ak || !b || !lektionen || !msg) return;
      const [besitzerId, p] = b;
      if (user.id !== besitzerId) {
        await followup(appId, itoken, "Abhaken kann nur die Person, der dieser Lernpfad gehört.");
        return;
      }
      const pfad = pfadLektionen(lektionen, p.rolle);
      const l = pfad.find((x) => x.id === lid);
      if (!l) return;
      const schonGelesen = p.gelesen.has(l.id);
      if (!schonGelesen && stand(pfad, p.gelesen).aktuelle?.id !== l.id) {
        await followup(appId, itoken, "Diese Lektion ist noch gesperrt. Lies erst die vorigen.");
        return;
      }
      if (!schonGelesen) {
        await merke(token, ak.speicher, zeileGelesen(besitzerId, l.id, l.nr, new Date().toISOString()));
        p.gelesen.add(l.id);
        // In die Bibliothek: eine Karte pro Seite, höchstens 10 Karten und 5.500 Zeichen pro Nachricht.
        const seiten = (await holeSeiten(l)) ?? [];
        const karten = bibliothekEmbeds(l, seiten);
        let ersteId: string | null = null;
        let paket: typeof karten = [];
        let laenge = 0;
        const sende = async () => {
          if (!paket.length) return;
          const m = await call<{ id: string }>(token, "POST", `/channels/${p.bibliothek}/messages`, { embeds: paket, allowed_mentions: { parse: [] } });
          ersteId ??= m?.id ?? null;
          paket = [];
          laenge = 0;
        };
        for (const k of karten) {
          const n = (k.title?.length ?? 0) + (k.description?.length ?? 0);
          if (paket.length >= 10 || laenge + n > 5500) await sende();
          paket.push(k);
          laenge += n;
        }
        await sende();
        if (ersteId) {
          const link = messageLink(p.bibliothek, ersteId);
          await merke(token, ak.speicher, zeileBib(besitzerId, l.id, l.nr, link));
          p.bib.set(l.id, { nr: l.nr, link });
        }
      }
      const naechste = stand(pfad, p.gelesen).aktuelle;
      await call(token, "PATCH", `/channels/${kanal}/messages/${msg}`, { ...gelesenAnsicht(l, naechste), allowed_mentions: { parse: [] } });
      await aktualisiere(token, besitzerId, p, lektionen);
    });
    return NextResponse.json({ type: 6 });
  }

  return NextResponse.json({ ok: true });
}

async function followup(appId: string, itoken: string, content: string) {
  await fetch(`${API}/webhooks/${appId}/${itoken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, flags: 64, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
}
