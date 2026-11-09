import { after, NextResponse } from "next/server";
import type { EmbedLike } from "@/lib/discord-calls";
import { analysiere, domainKey, normalizeUrl } from "@/lib/lead-analyse";
import {
  call,
  ablageKanal,
  besitzerId,
  mitBesitzer,
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
  teamRolle,
  vergissAbgelehnt,
} from "@/lib/leads";
import { nameVon } from "@/lib/team";
import { legeKundenZeileAn, notionConfigured } from "@/lib/notion-api";
import type { Analyse } from "@/lib/lead-analyse";
import { analyseAusFormular, analyseAusPlatz, formularModal, formularWerte, manuellerSchluessel, webArt, type Platz, erkenneEingabe, kandidatenSchluessel, trefferAuswahl } from "@/lib/lead-ohne-website";
import { findeFirmen, holePlatz, platzAusMapsLink } from "@/lib/lead-suche";

// Befehle /lead und /lead-delete und die Knöpfe unter den Lead-Karten.

export interface LeadInteraction {
  type: number;
  token?: string;
  application_id?: string;
  channel_id?: string;
  data?: {
    name?: string;
    custom_id?: string;
    options?: { name: string; value?: unknown }[];
    components?: { components?: { custom_id: string; value?: string }[] }[];
  };
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

function option(i: LeadInteraction, name: string): string {
  const v = i.data?.options?.find((o) => o.name === name)?.value;
  return typeof v === "string" ? v.trim() : "";
}
const linkOption = (i: LeadInteraction) => option(i, "link");

/** Knopf, der das Formular öffnet (Discord erlaubt ein Formular nur als direkte Antwort auf einen Klick). */
const formularKnopf = (name = "", ort = "") => [
  {
    type: 1,
    components: [
      {
        type: 2,
        style: 1,
        label: "Formular öffnen",
        emoji: { name: "📝" },
        custom_id: `lead:formular:${name.replace(/\|/g, " ").slice(0, 40)}|${ort.replace(/\|/g, " ").slice(0, 30)}`,
      },
    ],
  },
];

/**
 * Legt die Lead-Karte in #leads an (nach der Prüfung auf doppelte Karten) und meldet das Ergebnis
 * dem, der /lead ausgeführt hat.
 */
async function veroeffentliche(token: string, appId: string, itoken: string, analyse: Analyse, url: string, schluessel: string, von: string, pruefen = true) {
  if (pruefen) {
    const bestehend = await findeBestehend(token, schluessel);
    if (bestehend?.art === "abgelehnt") {
      await setzeAntwort(appId, itoken, `🚫 **${analyse.firma}** wurde schon abgelehnt (am ${bestehend.datum ?? "?"}). Nur David kann sie mit /lead-delete zurücksetzen.`);
      return;
    }
    if (bestehend) {
      const wo = bestehend.art === "ablage" ? "in der Ablage (Kein Interesse)" : "als Karte";
      await setzeAntwort(appId, itoken, `ℹ️ Zu **${analyse.firma}** gibt es bereits eine Karte ${wo}: ${kanalLink(bestehend.channelId, bestehend.messageId)}${bestehend.status ? `\nStand: ${bestehend.status}` : ""}`);
      return;
    }
  }
  const kanal = await kartenKanal(token);
  if (!kanal) {
    await setzeAntwort(appId, itoken, "⚠️ Den Kanal #leads konnte ich nicht anlegen. Bitte die Rechte des Bots prüfen.");
    return;
  }
  const rolle = await teamRolle(token);
  const id = await postKarte(
    token,
    kanal,
    kartenEmbed(analyse, url, schluessel, von),
    leadComponents("vote"),
    rolle ? { content: `<@&${rolle}> Neuer Lead: **${analyse.firma.replace(/[*_~`|>@]/g, "")}** – jetzt abstimmen`, roleId: rolle } : undefined,
  );
  if (!id) {
    await setzeAntwort(appId, itoken, `⚠️ Die Karte konnte ich nicht anlegen. Bitte nochmal versuchen. (${letzterFehler.slice(0, 150)})`);
    return;
  }
  const luecke = !analyse.telefon && !analyse.email;
  await setzeAntwort(
    appId,
    itoken,
    `✅ Karte zu **${analyse.firma}** liegt in #leads: ${kanalLink(kanal, id)}` + (luecke ? "\n⚠️ Telefon und E-Mail fehlen noch. Bitte selbst nachschauen." : ""),
  );
}

/** Karte aus einem Google-Maps-Eintrag. Hat die Firma eine echte Website, wird sie wie bei /lead ausgewertet. */
async function karteAusPlatz(token: string, appId: string, itoken: string, p: Platz, von: string) {
  let analyse = analyseAusPlatz(p);
  let url = p.maps ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`;
  let schluessel = `gmaps-${p.id}`;
  const dom = p.website && webArt(p.website) === "site" ? domainKey(p.website) : null;
  if (p.website && dom) {
    schluessel = dom;
    url = p.website;
    await setzeAntwort(appId, itoken, `🔎 Gefunden: **${p.name}**. Ich schaue mir die Website an …`);
    const res = await analysiere(p.website);
    if (res.ok) {
      analyse = { ...res.analyse, firma: res.analyse.firma || p.name, telefon: res.analyse.telefon ?? p.telefon, adresse: res.analyse.adresse ?? p.adresse };
      url = res.url;
      schluessel = res.domain;
    }
  }
  await veroeffentliche(token, appId, itoken, analyse, url, schluessel, von);
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
    if (user.id !== OWNER_ID) return ephemeral("Einen Lead zurücksetzen darf nur David.");
    // 09.11.: wie /lead ein Feld – Website, Maps-Link oder Firma mit Ort; die Firma wird zurückgesetzt (Karte weg, Ablehnung aufgehoben)
    const eingabeDel = erkenneEingabe(option(i, "eingabe") || linkOption(i));
    if (eingabeDel.art === "leer") return ephemeral("Schreib nach `/lead-delete` die Website, den Maps-Link oder Firma und Ort.");
    after(async () => {
      try {
        let schluessel: string[] = [];
        let anzeige = eingabeDel.text;
        if (eingabeDel.art === "website") {
          const url = normalizeUrl(eingabeDel.text);
          const domain = url ? domainKey(url) : null;
          if (domain) schluessel = [domain];
          anzeige = domain ?? anzeige;
        } else {
          await setzeAntwort(appId, itoken, "🔎 Ich schaue bei Google Maps nach …");
          const treffer = eingabeDel.art === "maps" ? [await platzAusMapsLink(eingabeDel.text)].filter((p) => p !== null) : ((await findeFirmen(eingabeDel.text)) ?? []);
          schluessel = treffer.flatMap((p) => kandidatenSchluessel(p, p.website && webArt(p.website) === "site" ? domainKey(p.website) : null));
        }
        let text = `Zu **${anzeige.replace(/[*_~`|>@]/g, "")}** gibt es nichts zurückzusetzen (keine Karte, keine Ablehnung).`;
        for (const k of schluessel) {
          const bestehend = await findeBestehend(token, k);
          if (!bestehend) continue;
          if (bestehend.art === "abgelehnt") {
            await vergissAbgelehnt(token, k);
            text = `🗑️ Die Ablehnung zu **${k}** ist aufgehoben. Die Firma darf jetzt wieder mit /lead vorgelegt werden.`;
          } else {
            await loescheNachricht(token, bestehend.channelId, bestehend.messageId);
            await vergissAbgelehnt(token, k);
            text = `🗑️ Die Karte zu **${k}** ist gelöscht. Die Firma ist zurückgesetzt.`;
          }
          break;
        }
        await setzeAntwort(appId, itoken, text);
      } catch (err) {
        console.error("[lead] /lead-delete fehlgeschlagen:", err);
        await setzeAntwort(appId, itoken, "⚠️ Das hat leider nicht geklappt. Bitte nochmal versuchen.");
      }
    });
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  // 09.11.: Ein Feld für alles (`eingabe`): Website, Google-Maps-Link oder Firmenname mit Ort. Die alten Felder link/name/ort gehen weiter.
  const roh = option(i, "eingabe") || linkOption(i) || [option(i, "name"), option(i, "ort")].filter(Boolean).join(" ");
  const art = erkenneEingabe(roh);
  const name = art.art === "name" ? art.text : "";
  const von = nameVon(user.id) ?? who;

  // ---- Leer: kurz erklären und das Formular anbieten
  if (art.art === "leer") {
    return NextResponse.json({
      type: 4,
      data: {
        flags: 64,
        content:
          "So legst du einen Lead an: Schreib nach `/lead` einfach, was du hast.\n• eine Website: `www.firma.de`\n• einen **Google-Maps-Link**\n• oder Firma und Ort: `Bäckerei Schmitt Mühlheim am Main`\nGibt es mehrere Treffer, zeige ich dir bis zu drei zur Auswahl. Oder trag die Firma von Hand ein:",
        components: formularKnopf(),
        allowed_mentions: { parse: [] },
      },
    });
  }

  // ---- Google-Maps-Link oder Firmenname: über Google Maps suchen
  if (art.art === "maps" || art.art === "name") {
    after(async () => {
      try {
        await setzeAntwort(appId, itoken, art.art === "maps" ? "🔎 Ich schaue bei Google Maps nach …" : `🔎 Ich suche **${name.replace(/[*_~`|>@]/g, "")}** bei Google Maps …`);
        const treffer = art.art === "maps" ? [await platzAusMapsLink(art.text)].filter((p) => p !== null) : ((await findeFirmen(name)) ?? []);
        if (!treffer.length) {
          await setzeAntwort(
            appId,
            itoken,
            art.art === "maps"
              ? "Zu diesem Link habe ich bei Google Maps keine Firma gefunden. Trag sie hier von Hand ein:"
              : "Bei Google Maps habe ich die Firma nicht gefunden. Trag sie hier von Hand ein:",
            formularKnopf(name, ""),
          );
          return;
        }
        // Mehrere Treffer: nur der, der /lead benutzt hat, sieht die Auswahl und klickt die richtige Firma
        if (treffer.length > 1) {
          const a = trefferAuswahl(treffer, name);
          await setzeAntwort(appId, itoken, a.content, a.components);
          return;
        }
        await karteAusPlatz(token, appId, itoken, treffer[0], von);
      } catch (err) {
        console.error("[lead] /lead (Maps) fehlgeschlagen:", err);
        await setzeAntwort(appId, itoken, "⚠️ Das hat leider nicht geklappt. Bitte nochmal versuchen.");
      }
    });
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  const url = normalizeUrl(art.text);
  const domain = url ? domainKey(url) : null;
  if (!url || !domain) {
    return ephemeral("Das ist keine gültige Webadresse. Schreib nach `/lead` eine Website, einen Google-Maps-Link oder Firma und Ort, z. B. `Bäckerei Schmitt Mühlheim am Main`.");
  }

  after(async () => {
    try {
      const bestehend = await findeBestehend(token, domain);
      if (bestehend?.art === "abgelehnt") {
        await setzeAntwort(
          appId,
          itoken,
          `🚫 **${domain}** wurde schon abgelehnt (am ${bestehend.datum ?? "?"}). Nur David kann sie mit /lead-delete zurücksetzen.`,
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
      await veroeffentliche(token, appId, itoken, res.analyse, res.url, res.domain, von, false);
    } catch (err) {
      console.error("[lead] /lead fehlgeschlagen:", err);
      await setzeAntwort(appId, itoken, "⚠️ Das hat leider nicht geklappt. Bitte nochmal versuchen.");
    }
  });
  return NextResponse.json(DEFERRED_EPHEMERAL);
}

// ---------------------------------------------------------------- Knöpfe

export function handleLeadButton(i: LeadInteraction, token: string | undefined) {
  const user = i.member?.user;
  const embed = i.message?.embeds?.[0];
  const messageId = i.message?.id;
  const channelId = i.channel_id;
  const action = (i.data?.custom_id ?? "").slice("lead:".length);

  // ---- Auswahl aus mehreren Google-Treffern (private Nachricht aus /lead): diese Firma übernehmen
  if (action.startsWith("wahl:")) {
    const appId = i.application_id;
    const itoken = i.token;
    const placeId = action.slice("wahl:".length);
    if (!user || !token || !appId || !itoken || !placeId) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal mit `/lead` anfangen.");
    const von = nameVon(user.id) ?? (i.member?.nick || user.global_name || user.username || "Unbekannt");
    after(async () => {
      try {
        await setzeAntwort(appId, itoken, "🔎 Gut, ich lege die Karte an …");
        const platz = await holePlatz(placeId);
        if (!platz) {
          await setzeAntwort(appId, itoken, "Diese Firma konnte ich bei Google Maps nicht mehr abrufen. Bitte nochmal mit `/lead` versuchen oder von Hand eintragen:", formularKnopf());
          return;
        }
        await karteAusPlatz(token, appId, itoken, platz, von);
      } catch (err) {
        console.error("[lead] Auswahl fehlgeschlagen:", err);
        await setzeAntwort(appId, itoken, "⚠️ Das hat leider nicht geklappt. Bitte nochmal versuchen.");
      }
    });
    return NextResponse.json(DEFERRED_UPDATE);
  }

  // ---- Lead von Hand: Formular öffnen und abschicken (ohne Karte, deshalb vor der Kartenprüfung)
  if (action === "formular" || action.startsWith("formular:")) {
    const [name = "", ort = ""] = action.slice("formular:".length).split("|");
    return NextResponse.json(formularModal(name, ort));
  }
  if (action === "formab") {
    const appId = i.application_id;
    const itoken = i.token;
    if (!user || !token || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");
    const w = formularWerte(i.data?.components);
    if (!w.firma || !w.ort) return ephemeral("Firma und Ort fehlen. Bitte nochmal mit `/lead` anfangen.");
    const von = nameVon(user.id) ?? (i.member?.nick || user.global_name || user.username || "Unbekannt");
    after(() => veroeffentliche(token, appId, itoken, analyseAusFormular(w), "", manuellerSchluessel(w.firma, w.ort), von));
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  // ---- Aussortieren: Bestätigung (kommt aus der privaten Rückfrage, deshalb vor der Kartenprüfung)
  if (action === "dropno") {
    return NextResponse.json({ type: 7, data: { content: "Abgebrochen. Die Karte bleibt, wie sie ist.", embeds: [], components: [] } });
  }
  if (action.startsWith("dropyes:")) {
    const ziel = action.slice("dropyes:".length);
    const appId = i.application_id;
    const itoken = i.token;
    if (!user || !token || !channelId || !ziel || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");
    after(async () => {
      const msg = await call<{ embeds?: EmbedLike[] }>(token, "GET", `/channels/${channelId}/messages/${ziel}`);
      const karte = msg?.embeds?.[0];
      if (!karte) {
        await setzeAntwort(appId, itoken, "Diese Karte gibt es nicht mehr.");
        return;
      }
      const besitzer = besitzerId(karte);
      if (besitzer !== user.id && user.id !== OWNER_ID) {
        await setzeAntwort(appId, itoken, "Aussortieren darf nur, wer den Lead übernommen hat (oder David).");
        return;
      }
      // Nur die Karte wegnehmen: Die Firma wird NICHT gesperrt und lässt sich später wieder anlegen.
      await loescheNachricht(token, channelId, ziel);
      await setzeAntwort(appId, itoken, `🗑️ **${(karte.title ?? "Die Firma").replace(/[*_~`|>@]/g, "")}** ist aussortiert. Du kannst sie später mit /lead in #lead-befehle wieder anlegen. In der Lead-Suche taucht sie nur auf, wenn du dort auf „Alle Firmen“ umschaltest.`);
    });
    return NextResponse.json({ type: 7, data: { content: "🗑️ Wird aussortiert …", embeds: [], components: [] } });
  }

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

  // ---- Übernehmen / Freigeben: wer ruft bei diesem Lead an?
  if (action === "take") {
    if (state !== "accepted") return ephemeral("Übernehmen geht erst, wenn die Karte angenommen ist.");
    const aktuell = besitzerId(embed);
    const wort = statusWort(embed);
    if (!aktuell) return update(mitBesitzer(embed, user.id), leadComponents("accepted", wort, user.id));
    if (aktuell === user.id || user.id === OWNER_ID) return update(mitBesitzer(embed, null), leadComponents("accepted", wort, null));
    return ephemeral(`Diesen Lead hat schon <@${aktuell}> übernommen. Freigeben kann nur sie/er (oder David).`);
  }

  // ---- Aussortieren: Firma im Moment nicht verfolgen (Karte weg, nichts wird gesperrt, NICHT "Kein Interesse")
  if (action === "drop") {
    if (state !== "accepted") return ephemeral("Aussortieren geht nur bei angenommenen Leads.");
    const aktuell = besitzerId(embed);
    if (aktuell !== user.id && user.id !== OWNER_ID) {
      return ephemeral(aktuell ? `Diesen Lead hat <@${aktuell}> übernommen. Aussortieren kann nur sie/er (oder David).` : "Übernimm den Lead zuerst, dann kannst du ihn aussortieren.");
    }
    const titel = (embed.title ?? "Die Firma").replace(/[*_~`|>@]/g, "");
    return NextResponse.json({
      type: 4,
      data: {
        flags: 64,
        content:
          `🗑️ **${titel}** wirklich aussortieren?\nDie Karte verschwindet. Die Firma wird **nicht** gesperrt, du kannst sie später mit /lead wieder anlegen. ` +
          "Das ist für Firmen, die ihr **im Moment nicht** nehmt. Hat der **Kunde** abgesagt, nimm bitte „Kunde: Kein Interesse“.",
        components: [
          {
            type: 1,
            components: [
              { type: 2, label: "Ja, aussortieren", style: 4, custom_id: `lead:dropyes:${messageId}` },
              { type: 2, label: "Abbrechen", style: 2, custom_id: "lead:dropno" },
            ],
          },
        ],
        allowed_mentions: { parse: [] },
      },
    });
  }

  // ---- Status nach der Annahme
  if (!action.startsWith("st:")) return NextResponse.json({ ok: true });
  if (state !== "accepted") return ephemeral("Der Status lässt sich erst nach der Annahme setzen.");
  // Status-Knöpfe (auch Kein Interesse und Lead aktiv) gehen nur, wenn man den Lead selbst übernommen hat.
  // Ausnahme: David darf immer, auch ohne Übernahme.
  const besitzer = besitzerId(embed);
  if (besitzer !== user.id && user.id !== OWNER_ID) {
    return ephemeral(
      besitzer
        ? `Diesen Lead hat <@${besitzer}> übernommen. Erst wenn sie/er ihn freigibt, kannst du ihn übernehmen und bearbeiten.`
        : "Übernimm den Lead zuerst mit dem Knopf „Übernehmen“, dann kannst du den Status ändern.",
    );
  }
  const st = action.slice(3);
  const zeit = uhrzeit();

  if (st === "open" || st === "work" || st === "contacted") {
    const wort = st === "open" ? "Offen" : st === "work" ? "In Arbeit" : "Kontaktiert";
    return update(mitStatus(embed, wort, zeit), leadComponents("accepted", wort, besitzerId(embed)));
  }

  if (st === "nointerest") {
    after(async () => {
      const ablage = await ablageKanal(token);
      if (!ablage) return;
      const id = await postKarte(token, ablage, archiviert(embed, zeit), []);
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
      const domain = (domainOfCard(embed) ?? "").replace(/^(gmaps|manuell)-.*/, "");
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
      const url = embed.description?.match(/🔗\s*(\S+)/)?.[1] ?? (domain ? `https://${domain}` : "");
      // Zuständig wird, wer den Lead übernommen hat (drückt David ohne Übernahme, dann David).
      const res = await legeKundenZeileAn({ analyse, url, domain, zustaendig: [besitzer ?? user.id] });
      if (!res.ok) {
        await postKarteHinweis(token, channelId, messageId, `⚠️ Lead aktiv hat nicht geklappt: ${res.fehler}`);
        return;
      }
      const neu = mitNotion(mitStatus(embed, "Lead aktiv", zeit, "active"), res.nr, res.seite);
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

