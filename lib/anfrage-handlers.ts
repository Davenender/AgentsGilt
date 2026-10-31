import { after, NextResponse } from "next/server";
import { followupPrivate } from "@/lib/discord";
import type { EmbedLike } from "@/lib/discord-calls";
import {
  anfrageKomponenten,
  anfrageState,
  anfrageStatusWort,
  datenAusKarte,
  gibAnfrageFrei,
  inKundenkanal,
  posteingangErledigt,
  posteingangErledigtEmbed,
  posteingangKomponenten,
  posteingangQuelle,
  setzeAnfrageStatus,
  weiterleitenZiele,
  type AnfrageState,
} from "@/lib/anfragen";
import { aendereKarte, anfragenKanal, besitzerId, call, clip, loescheNachricht, mitBesitzer, OWNER_ID, postKarte, setzeAntwort } from "@/lib/leads";
import { legeLeadAusAnfrage, holeKundenNr, listeKunden, notionConfigured, type KundeKurz } from "@/lib/notion-api";

// Knöpfe unter den Anfrage-Karten in #anfragen (anf:) und unter den Karten im privaten #posteingang (pb:).

export interface AnfInteraction {
  type: number;
  token?: string;
  application_id?: string;
  channel_id?: string;
  data?: {
    custom_id?: string;
    component_type?: number;
    values?: string[];
    components?: { components?: { custom_id: string; value?: string }[] }[];
  };
  member?: { user?: { id: string; username?: string; global_name?: string | null }; nick?: string | null };
  message?: { id: string; embeds?: EmbedLike[] };
}

const API = "https://discord.com/api/v10";
const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const DEFERRED_UPDATE = { type: 6 };
const DEFERRED_EPHEMERAL = { type: 5, data: { flags: 64 } };

type Message = { id: string; embeds?: EmbedLike[] };

async function holeKarte(token: string, channelId: string, messageId: string): Promise<EmbedLike | null> {
  const msg = await call<Message>(token, "GET", `/channels/${channelId}/messages/${messageId}`);
  return msg?.embeds?.[0] ?? null;
}

/** Ersetzt die private Antwort durch ein Auswahlmenü (oder einen Text). */
async function antwortMitAuswahl(appId: string, itoken: string, content: string, components: unknown[]) {
  try {
    await fetch(`${API}/webhooks/${appId}/${itoken}/messages/@original`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, components, embeds: [], allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error("[anfrage] Auswahl senden fehlgeschlagen:", err);
  }
}

async function zeigeKunden(appId: string, itoken: string, messageId: string, kunden: KundeKurz[], gesamt: number) {
  await antwortMitAuswahl(
    appId,
    itoken,
    gesamt > 25
      ? `${gesamt} Treffer, hier die ersten 25. Such genauer, wenn der Kunde fehlt. Die Anfrage wandert in seinen Kanal, die Karte hier verschwindet.`
      : "Zu welchem Kunden gehört die Anfrage? Sie wandert in seinen Kanal, die Karte hier verschwindet.",
    auswahl(
      `anf:kundesel:${messageId}`,
      "Kunde wählen",
      kunden.slice(0, 25).map((k) => ({
        label: clip(`${k.nr} · ${k.name}`, 100),
        value: k.nr,
        ...(k.email ? { description: clip(k.email, 100) } : {}),
      })),
    ),
  );
}

const auswahl = (customId: string, placeholder: string, options: { label: string; value: string; description?: string }[]) => [
  { type: 1, components: [{ type: 3, custom_id: customId, placeholder, min_values: 1, max_values: 1, options }] },
];

// ------------------------------------------------------------- #anfragen

export function handleAnfrage(i: AnfInteraction, token: string | undefined) {
  const user = i.member?.user;
  const embed = i.message?.embeds?.[0];
  const messageId = i.message?.id;
  const channelId = i.channel_id;
  const appId = i.application_id;
  const itoken = i.token;
  const id = (i.data?.custom_id ?? "").slice("anf:".length);
  if (!user || !token || !channelId || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");

  const update = (e: EmbedLike, components: unknown[]) =>
    NextResponse.json({ type: 7, data: { embeds: [e], components, allowed_mentions: { parse: [] } } });
  const darf = (e: EmbedLike): string | null => {
    const b = besitzerId(e);
    if (b === user.id || user.id === OWNER_ID) return null;
    return b
      ? `Diese Anfrage hat <@${b}> übernommen. Erst wenn sie/er sie freigibt, kannst du sie übernehmen und bearbeiten.`
      : "Übernimm die Anfrage zuerst mit dem Knopf „Übernehmen“.";
  };

  // ---- Suchfenster abgeschickt: passende Kunden zur Auswahl
  if (id.startsWith("ksuchefenster:")) {
    const ziel = id.slice("ksuchefenster:".length);
    const suche = (i.data?.components?.[0]?.components?.[0]?.value ?? "").trim().toLowerCase();
    if (!suche) return ephemeral("Die Suche war leer.");
    after(async () => {
      const alle = await listeKunden();
      if (!alle) return void (await setzeAntwort(appId, itoken, "⚠️ Die Kunden konnte ich gerade nicht aus Notion lesen. Bitte nochmal versuchen."));
      const treffer = alle.filter((k) => `${k.nr} ${k.name} ${k.email}`.toLowerCase().includes(suche));
      if (!treffer.length) return void (await setzeAntwort(appId, itoken, `Zu „${clip(suche, 40)}“ habe ich keinen Kunden gefunden. Klick nochmal auf „Bestehender Kunde?“ und such anders.`));
      await zeigeKunden(appId, itoken, ziel, treffer, treffer.length);
    });
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  // ---- Kunde gewählt (Auswahlmenü, private Nachricht)
  if (id.startsWith("kundesel:")) {
    const ziel = id.slice("kundesel:".length);
    const nr = i.data?.values?.[0];
    if (!nr) return ephemeral("Es wurde kein Kunde gewählt.");
    after(async () => {
      const karte = await holeKarte(token, channelId, ziel);
      if (!karte) return void (await setzeAntwort(appId, itoken, "Diese Anfrage gibt es nicht mehr."));
      const verboten = darf(karte);
      if (verboten) return void (await setzeAntwort(appId, itoken, verboten));
      const res = await inKundenkanal(token, nr, nr, karte, "📨 Neue Anfrage über die Website");
      if (!res.ok) return void (await setzeAntwort(appId, itoken, `⚠️ ${res.fehler}`));
      await loescheNachricht(token, channelId, ziel);
      await setzeAntwort(appId, itoken, `✅ Die Anfrage liegt jetzt bei ${nr} in <#${res.kanalId}>. Die Karte hier ist gelöscht.`);
    });
    return NextResponse.json({ type: 7, data: { content: "⏳ Wird zugeordnet …", components: [], embeds: [] } });
  }

  if (!embed || !messageId) return ephemeral("Diese Karte ist nicht mehr aktuell.");
  const state = anfrageState(embed);
  if (state === "lead" || state === "erledigt") return ephemeral("Diese Anfrage ist schon abgeschlossen.");

  // ---- Übernehmen / Freigeben
  if (id === "take") {
    const aktuell = besitzerId(embed);
    const wort = anfrageStatusWort(embed);
    if (!aktuell) {
      const neu: AnfrageState = "arbeit";
      return update({ ...mitBesitzer(embed, user.id), color: 0x22c55e }, anfrageKomponenten(neu, wort, user.id));
    }
    if (aktuell === user.id || user.id === OWNER_ID) {
      const frei = mitBesitzer(embed, null);
      return update({ ...frei, color: wort === "Offen" ? 0xd4a23c : frei.color }, anfrageKomponenten(wort === "Offen" ? "neu" : "arbeit", wort, null));
    }
    return ephemeral(`Diese Anfrage hat schon <@${aktuell}> übernommen. Freigeben kann nur sie/er (oder David).`);
  }

  // Alles Weitere nur für den, der übernommen hat (oder David).
  const verboten = darf(embed);
  if (verboten) return ephemeral(verboten);

  // ---- Status
  if (id === "st:open" || id === "st:work" || id === "st:contacted") {
    const wort = id === "st:open" ? "Offen" : id === "st:work" ? "In Arbeit" : "Kontaktiert";
    return update(setzeAnfrageStatus(embed, wort, "arbeit"), anfrageKomponenten("arbeit", wort, besitzerId(embed)));
  }

  if (id === "st:done" || id === "st:nointerest") {
    return update(setzeAnfrageStatus(embed, "Erledigt", "erledigt"), []);
  }

  // ---- Bestehender Kunde? Bis 25 Kunden gleich zur Auswahl, sonst erst suchen
  if (id === "kunde") {
    if (!notionConfigured()) return ephemeral("Notion ist noch nicht verbunden (NOTION_TOKEN fehlt bei Vercel).");
    after(async () => {
      const kunden = await listeKunden();
      if (!kunden) return void (await setzeAntwort(appId, itoken, "⚠️ Die Kunden konnte ich gerade nicht aus Notion lesen. Bitte nochmal versuchen."));
      if (!kunden.length) return void (await setzeAntwort(appId, itoken, "In Notion gibt es noch keine Kunden."));
      if (kunden.length <= 25) return void (await zeigeKunden(appId, itoken, messageId, kunden, kunden.length));
      await antwortMitAuswahl(appId, itoken, `Es gibt ${kunden.length} Kunden. Such nach Name, E-Mail oder Nummer.`, [
        { type: 1, components: [{ type: 2, label: "Kunde suchen", style: 1, custom_id: `anf:ksuche:${messageId}` }] },
      ]);
    });
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  if (id === "ksuche") {
    return NextResponse.json({
      type: 9,
      data: {
        custom_id: `anf:ksuchefenster:${messageId}`,
        title: "Kunde suchen",
        components: [
          {
            type: 1,
            components: [
              { type: 4, custom_id: "suche", label: "Name, E-Mail oder KND-Nummer", style: 1, required: true, min_length: 1, max_length: 80 },
            ],
          },
        ],
      },
    });
  }

  // ---- Lead aktiv: Eintrag in Notion, Anfrage wandert in den neuen Kundenkanal
  if (id === "st:active") {
    if (anfrageStatusWort(embed) !== "Kontaktiert") return ephemeral("Erst auf „Kontaktiert“ setzen, dann „Lead aktiv“.");
    if (!notionConfigured()) return ephemeral("Notion ist noch nicht verbunden (NOTION_TOKEN fehlt bei Vercel). Der Status bleibt unverändert.");
    after(async () => {
      const res = await legeLeadAn(token, embed);
      if (!res.ok) return void (await followupPrivate(appId, itoken, `⚠️ ${res.fehler}`));
      if (res.verschoben) {
        await loescheNachricht(token, channelId, messageId);
        await followupPrivate(appId, itoken, `✅ ${res.nr} ist in Notion angelegt. Die Anfrage liegt jetzt in <#${res.kanalId}>, die Karte hier ist gelöscht.`);
        return;
      }
      await aendereKarte(token, channelId, messageId, setzeAnfrageStatus(embed, "Lead aktiv", "lead", res.notiz), []);
      await followupPrivate(appId, itoken, `✅ ${res.nr ?? "Der Lead"} ist in Notion angelegt. ${res.hinweis}`);
    });
    return NextResponse.json(DEFERRED_UPDATE);
  }

  return NextResponse.json({ ok: true });
}

/** Legt den Lead in Notion an und schiebt die Anfrage in den Kundenkanal. */
async function legeLeadAn(
  token: string,
  karte: EmbedLike,
): Promise<
  | { ok: true; verschoben: true; nr: string; kanalId: string }
  | { ok: true; verschoben: false; nr: string | null; notiz: string; hinweis: string }
  | { ok: false; fehler: string }
> {
  const d = datenAusKarte(karte);
  const res = await legeLeadAusAnfrage(d);
  if (!res.ok) return res;
  let nr = res.nr;
  if (!nr) {
    await new Promise((r) => setTimeout(r, 2000));
    nr = await holeKundenNr(res.seite);
  }
  const notiz = `${nr ? `${nr} · ` : ""}[In Notion öffnen](${res.seite})`;
  if (!nr) return { ok: true, verschoben: false, nr: null, notiz, hinweis: "Die Kunden-Nr. war noch nicht da, die Anfrage bleibt deshalb hier stehen." };
  const move = await inKundenkanal(token, nr, res.titel, karte);
  if (!move.ok) return { ok: true, verschoben: false, nr, notiz, hinweis: `Die Anfrage konnte nicht in den Kundenkanal gelegt werden: ${move.fehler}` };
  return { ok: true, verschoben: true, nr, kanalId: move.kanalId };
}

// ------------------------------------------------------------ #posteingang

export function handlePosteingang(i: AnfInteraction, token: string | undefined) {
  const user = i.member?.user;
  const embed = i.message?.embeds?.[0];
  const messageId = i.message?.id;
  const channelId = i.channel_id;
  const appId = i.application_id;
  const itoken = i.token;
  const id = (i.data?.custom_id ?? "").slice("pb:".length);
  if (!user || !token || !channelId || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");
  if (user.id !== OWNER_ID) return ephemeral("Der Posteingang gehört David.");

  // ---- Ziel gewählt (Auswahlmenü, private Nachricht)
  if (id.startsWith("fwdto:")) {
    const ziel = id.slice("fwdto:".length);
    const zielKanal = i.data?.values?.[0];
    if (!zielKanal) return ephemeral("Es wurde kein Kanal gewählt.");
    after(async () => {
      const karte = await holeKarte(token, channelId, ziel);
      if (!karte) return void (await setzeAntwort(appId, itoken, "Diese Karte gibt es nicht mehr."));
      if (posteingangErledigt(karte)) return void (await setzeAntwort(appId, itoken, "Diese Karte ist schon erledigt."));
      const info = await call<{ name?: string }>(token, "GET", `/channels/${zielKanal}`);
      const name = info?.name ?? "dem Kanal";
      const quelle = posteingangQuelle(karte);

      let ok: boolean;
      if (quelle === "form" && zielKanal === (await anfragenKanal(token))) {
        // Wohin sonst als in die normale Anfragenliste: aus der Karte wird eine richtige Anfrage.
        ok = await gibAnfrageFrei(token, karte);
      } else {
        const kopie: EmbedLike = {
          title: clip(`📬 Weitergeleitet: ${(karte.title ?? "").replace(/^⚠️\s*(Verdacht:\s*)?/, "")}`, 250),
          description: karte.description,
          color: 0xd4a23c,
          fields: (karte.fields ?? []).filter((f) => !["Status", "Warum verdächtig?"].includes(f.name)),
          footer: { text: "Weitergeleitet aus dem Posteingang" },
        };
        ok = Boolean(await postKarte(token, zielKanal, kopie, []));
      }
      if (!ok) return void (await setzeAntwort(appId, itoken, `⚠️ In #${name} konnte ich nichts schreiben. Bitte die Rechte des Bots prüfen.`));
      await aendereKarte(token, channelId, ziel, posteingangErledigtEmbed(karte, `Weitergeleitet nach #${name}`), []);
      await setzeAntwort(appId, itoken, `✅ Weitergeleitet nach <#${zielKanal}>.`);
    });
    return NextResponse.json({ type: 7, data: { content: "⏳ Wird weitergeleitet …", components: [], embeds: [] } });
  }

  if (!embed || !messageId) return ephemeral("Diese Karte ist nicht mehr aktuell.");
  if (posteingangErledigt(embed)) return ephemeral("Diese Karte ist schon erledigt.");
  const quelle = posteingangQuelle(embed);

  if (id === "free") {
    after(async () => {
      if (!(await gibAnfrageFrei(token, embed))) {
        await followupPrivate(appId, itoken, "⚠️ Die Anfrage konnte ich nicht in #anfragen legen. Bitte nochmal versuchen.");
        return;
      }
      await aendereKarte(token, channelId, messageId, posteingangErledigtEmbed(embed, "Freigegeben, liegt jetzt in #anfragen"), []);
    });
    return NextResponse.json(DEFERRED_UPDATE);
  }

  if (id === "fwd") {
    after(async () => {
      const ziele = await weiterleitenZiele(token);
      if (!ziele.length) return void (await setzeAntwort(appId, itoken, "Ich habe keinen Kanal zum Weiterleiten gefunden."));
      await antwortMitAuswahl(
        appId,
        itoken,
        "Wohin soll die Karte? Sie wird dort ohne Knöpfe abgelegt.",
        auswahl(
          `pb:fwdto:${messageId}`,
          "Kanal wählen",
          ziele.map((z) => ({ label: `#${z.name}`, value: z.id })),
        ),
      );
    });
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  if (id === "weg") {
    // Bei Mails aus Gmail archiviert später das Google-Skript die Mail (kommt mit der Gmail-Anbindung).
    return NextResponse.json({
      type: 7,
      data: { embeds: [posteingangErledigtEmbed(embed, "Spam / Weg")], components: posteingangKomponenten(quelle, true), allowed_mentions: { parse: [] } },
    });
  }

  if (id === "lead") {
    if (!notionConfigured()) return ephemeral("Notion ist noch nicht verbunden (NOTION_TOKEN fehlt bei Vercel).");
    after(async () => {
      const res = await legeLeadAn(token, embed);
      if (!res.ok) return void (await followupPrivate(appId, itoken, `⚠️ ${res.fehler}`));
      const was = res.verschoben ? `Lead ${res.nr} angelegt, Anfrage liegt im Kundenkanal` : `Lead ${res.nr ?? ""} angelegt (${res.hinweis})`;
      await aendereKarte(token, channelId, messageId, posteingangErledigtEmbed(embed, was.trim()), []);
    });
    return NextResponse.json(DEFERRED_UPDATE);
  }

  return NextResponse.json({ ok: true });
}
