import { after, NextResponse } from "next/server";
import type { EmbedLike } from "@/lib/discord-calls";
import { analysiere, domainKey, normalizeUrl } from "@/lib/lead-analyse";
import {
  ablageKanal,
  letzterFehler,
  ablehnungAbbrechen,
  aendereKarte,
  archiviert,
  domainOfCard,
  findeBestehend,
  kartenEmbed,
  kartenKanal,
  leadComponents,
  loescheNachricht,
  merkeAbgelehnt,
  mitNotion,
  mitStatus,
  OWNER_ID,
  postKarte,
  setzeAntwort,
  statusWort,
  stateOf,
  stimme,
  vergissAbgelehnt,
} from "@/lib/leads";
import { legeKundenZeileAn, notionConfigured } from "@/lib/notion-api";

// Befehle /lead und /lead-delete und die Knöpfe unter den Lead-Karten.

export interface LeadInteraction {
  type: number;
  token?: string;
  application_id?: string;
  channel_id?: string;
  data?: { name?: string; custom_id?: string; options?: { name: string; value?: unknown }[] };
  member?: { user?: { id: string; username?: string; global_name?: string | null }; nick?: string | null };
  message?: { id: string; embeds?: EmbedLike[] };
}

const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const DEFERRED_EPHEMERAL = { type: 5, data: { flags: 64 } };
const DEFERRED_UPDATE = { type: 6 };

const uhrzeit = () =>
  new Date().toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

function linkOption(i: LeadInteraction): string {
  const v = i.data?.options?.find((o) => o.name === "link")?.value;
  return typeof v === "string" ? v : "";
}

const kanalLink = (channelId: string, messageId: string) =>
  `https://discord.com/channels/${process.env.DISCORD_GUILD_ID || "1564355422222159975"}/${channelId}/${messageId}`;

// ----------------------------------------------------------------- /lead

export function handleLeadCommand(i: LeadInteraction, token: string | undefined, who: string) {
  const appId = i.application_id;
  const itoken = i.token;
  const user = i.member?.user;
  if (!token || !appId || !itoken || !user) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");

  if (i.data?.name === "lead-delete") {
    if (user.id !== OWNER_ID) return ephemeral("Karten löschen darf nur David.");
    const url = normalizeUrl(linkOption(i));
    const domain = url ? domainKey(url) : null;
    if (!domain) return ephemeral("Das ist keine gültige Webadresse.");
    after(async () => {
      const bestehend = await findeBestehend(token, domain);
      let text: string;
      if (!bestehend) {
        text = `Zu **${domain}** gibt es nichts zu löschen.`;
      } else if (bestehend.art === "abgelehnt") {
        const n = await vergissAbgelehnt(token, domain);
        text = `🗑️ **${domain}** war abgelehnt vermerkt (${n} Eintrag). Die Firma darf jetzt wieder mit /lead vorgelegt werden.`;
      } else {
        await loescheNachricht(token, bestehend.channelId, bestehend.messageId);
        await vergissAbgelehnt(token, domain);
        text = `🗑️ Die Karte zu **${domain}** ist gelöscht.`;
      }
      await setzeAntwort(appId, itoken, text);
    });
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  const eingabe = linkOption(i);
  const url = normalizeUrl(eingabe);
  const domain = url ? domainKey(url) : null;
  if (!url || !domain) {
    return ephemeral("Das ist keine gültige Webadresse. Beispiel: `/lead link: www.beispiel.de`");
  }

  after(async () => {
    try {
      const bestehend = await findeBestehend(token, domain);
      if (bestehend?.art === "abgelehnt") {
        await setzeAntwort(
          appId,
          itoken,
          `🚫 **${domain}** wurde schon abgelehnt (am ${bestehend.datum ?? "?"}). Die Ablehnung ist endgültig. Nur David kann sie mit /lead-delete aufheben.`,
        );
        return;
      }
      if (bestehend) {
        const wo = bestehend.art === "ablage" ? "in der Ablage (Kein Interesse)" : "als Karte";
        await setzeAntwort(
          appId,
          itoken,
          `ℹ️ Zu **${domain}** gibt es bereits eine Anfrage ${wo}: ${kanalLink(bestehend.channelId, bestehend.messageId)}${bestehend.status ? `\nStand: ${bestehend.status}` : ""}`,
        );
        return;
      }

      await setzeAntwort(appId, itoken, `🔎 Ich schaue mir die Seite von **${domain}** an …`);
      const res = await analysiere(url);
      if (!res.ok) {
        await setzeAntwort(appId, itoken, `⚠️ ${res.fehler}`);
        return;
      }
      const kanal = await kartenKanal(token);
      if (!kanal) {
        await setzeAntwort(appId, itoken, "⚠️ Den Kanal #leads konnte ich nicht anlegen. Bitte die Rechte des Bots prüfen.");
        return;
      }
      const embed = kartenEmbed(res.analyse, res.url, res.domain, who);
      const id = await postKarte(token, kanal, embed, leadComponents("vote"));
      if (!id) {
        await setzeAntwort(appId, itoken, `⚠️ Die Karte konnte ich nicht anlegen. Bitte nochmal versuchen. (${letzterFehler.slice(0, 200)})`);
        return;
      }
      const luecke = !res.analyse.telefon && !res.analyse.email;
      await setzeAntwort(
        appId,
        itoken,
        `✅ Karte zu **${res.analyse.firma}** liegt in #leads: ${kanalLink(kanal, id)}` +
          (luecke ? "\n⚠️ Ich habe weder Telefon noch E-Mail gefunden. Schaut bitte selbst auf der Seite nach." : ""),
      );
    } catch (err) {
      console.error("[lead] /lead fehlgeschlagen:", err);
      await setzeAntwort(appId, itoken, "⚠️ Das hat leider nicht geklappt. Bitte nochmal versuchen.");
    }
  });
  return NextResponse.json(DEFERRED_EPHEMERAL);
}

// ---------------------------------------------------------------- Knöpfe

export function handleLeadButton(i: LeadInteraction, token: string | undefined, who: string) {
  const user = i.member?.user;
  const embed = i.message?.embeds?.[0];
  const messageId = i.message?.id;
  const channelId = i.channel_id;
  const action = (i.data?.custom_id ?? "").slice("lead:".length);
  if (!user || !embed || !messageId || !channelId || !token) return ephemeral("Diese Karte ist nicht mehr aktuell.");
  const state = stateOf(embed);
  const update = (e: EmbedLike, components: unknown[]) =>
    NextResponse.json({ type: 7, data: { embeds: [e], components, allowed_mentions: { parse: [] } } });

  // ---- Abstimmung
  if (action === "yes" || action === "no") {
    if (state !== "vote" && state !== "confirm") return ephemeral("Über diese Karte ist schon entschieden.");
    if (state === "confirm") return ephemeral("Die Ablehnung wartet auf Bestätigung. Klickt „Sicher ablehnen“ oder „Abbrechen“.");
    const res = stimme(embed, user.id, action === "yes");
    if (res.art === "doppelt") return ephemeral(res.text);
    return update(res.embed, leadComponents(res.state, "Offen"));
  }

  if (action === "cancel") {
    if (state !== "confirm") return ephemeral("Hier gibt es nichts abzubrechen.");
    return update(ablehnungAbbrechen(embed), leadComponents("vote"));
  }

  if (action === "sure") {
    if (state !== "confirm") return ephemeral("Hier gibt es nichts abzulehnen.");
    const domain = domainOfCard(embed);
    after(async () => {
      if (domain) await merkeAbgelehnt(token, domain, embed.title ?? domain);
      await loescheNachricht(token, channelId, messageId);
    });
    return NextResponse.json(DEFERRED_UPDATE);
  }

  // ---- Status nach der Annahme
  if (!action.startsWith("st:")) return NextResponse.json({ ok: true });
  if (state !== "accepted") return ephemeral("Der Status lässt sich erst nach der Annahme setzen.");
  const st = action.slice(3);
  const zeit = uhrzeit();
  const tag = `<@${user.id}>`;

  if (st === "open" || st === "work" || st === "contacted") {
    const wort = st === "open" ? "Offen" : st === "work" ? "In Arbeit" : "Kontaktiert";
    return update(mitStatus(embed, wort, tag, zeit), leadComponents("accepted", wort));
  }

  if (st === "nointerest") {
    after(async () => {
      const ablage = await ablageKanal(token);
      if (!ablage) return;
      const id = await postKarte(token, ablage, archiviert(embed, tag, zeit), []);
      if (id) await loescheNachricht(token, channelId, messageId);
    });
    return NextResponse.json(DEFERRED_UPDATE);
  }

  if (st === "active") {
    if (statusWort(embed) !== "Kontaktiert") return ephemeral("Erst auf „Kontaktiert“ setzen, dann „Lead aktiv“.");
    if (!notionConfigured()) {
      return ephemeral("Notion ist noch nicht verbunden (NOTION_TOKEN fehlt bei Vercel). Der Status bleibt unverändert.");
    }
    after(async () => {
      const domain = domainOfCard(embed) ?? "";
      const f = (name: string) => {
        const v = embed.fields?.find((x) => x.name === name)?.value;
        return v && v !== "nicht gefunden" ? v.replace(/​/g, "") : null;
      };
      const passtZu = f("Passt zu");
      const analyse = {
        firma: (embed.title ?? domain).replace(/​/g, ""),
        branche: f("Branche"),
        ansprechpartner: f("Ansprechpartner"),
        adresse: f("Adresse"),
        telefon: f("Telefon"),
        email: f("E-Mail"),
        zusammenfassung: (embed.description ?? "").split("\n\n🔗")[0].replace(/​/g, ""),
        auffaelligkeiten: (f("Auffällig an der Website") ?? "")
          .split("\n")
          .map((x) => x.replace(/^•\s*/, "").trim())
          .filter(Boolean),
        passt: passtZu ? passtZu.split(" – ")[0] : null,
        begruendung: passtZu?.includes(" – ") ? passtZu.split(" – ").slice(1).join(" – ") : null,
      };
      const url = embed.description?.match(/🔗\s*(\S+)/)?.[1] ?? `https://${domain}`;
      const res = await legeKundenZeileAn({ analyse, url, domain, von: who });
      if (!res.ok) {
        await postKarteHinweis(token, channelId, messageId, `⚠️ Lead aktiv hat nicht geklappt: ${res.fehler}`);
        return;
      }
      const neu = mitNotion(mitStatus(embed, "Lead aktiv", tag, zeit, "active"), res.nr, res.seite);
      await aendereKarte(token, channelId, messageId, neu, leadComponents("active"));
    });
    return NextResponse.json(DEFERRED_UPDATE);
  }

  return NextResponse.json({ ok: true });
}

async function postKarteHinweis(token: string, channelId: string, messageId: string, text: string) {
  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bot ${token}` },
    body: JSON.stringify({
      content: text,
      message_reference: { message_id: messageId, fail_if_not_exists: false },
      allowed_mentions: { parse: [] },
    }),
    signal: AbortSignal.timeout(6000),
  }).catch(() => {});
}

