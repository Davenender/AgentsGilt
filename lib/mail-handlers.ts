// Knöpfe für Mails an Kunden (mail:), Etappe 2 vom 16.11.2026. Davids Entscheidungen:
// - Teammitglieder schreiben, David gibt frei. Das Team sieht nur „📧 Mail geht raus“, danach
//   „✅ Mail gesendet um …“ oder „❌ Mail konnte nicht abgeschickt werden: <Grund>“, nie Davids Namen.
// - Der Knopf öffnet erst privat einen KI-Entwurf; „Bearbeiten & senden“ öffnet das Fenster mit dem Text
//   (Discord-Fenster müssen sofort kommen, der Entwurf braucht ein paar Sekunden).
// Abläufe:
//   mail:start:<ort>              → privat „✍️ Entwurf …“ mit Knopf mail:edit:<ort>:<quelle>
//   mail:edit:<ort>:<quelle>      → Fenster mail:send:<ort>:<quelle>
//   mail:send:<ort>:<quelle>      → Team: Zeile im Kanal, Freigabe-Karte in #posteingang, Push an David
//                                   David: sofort senden
//   mail:ok / mail:aendern / mail:nein (an der Freigabe-Karte, nur David)
//   mail:aendernsend:<karte>      → geänderten Text senden
//   mail:grund:<karte>, mail:grundtext:<karte> → ablehnen mit Grund
// Reine Logik: lib/mail-antwort.ts (Tests: tests/mail-antwort.test.ts, tests/mail-handlers.test.ts).
import { after, NextResponse } from "next/server";
import type { AnfInteraction } from "@/lib/anfrage-handlers";
import { datenAusKarte } from "@/lib/anfragen";
import { listMessages, messageLink } from "@/lib/discord";
import type { EmbedLike } from "@/lib/discord-calls";
import { findeKarte } from "@/lib/kundenkanal";
import { aendereKarte, besitzerId, call, posteingangKanal, postKarte, setzeAntwort } from "@/lib/leads";
import { sendMail } from "@/lib/mail";
import {
  BETREFF_MAX,
  darfMailen,
  fensterWerte,
  TEXT_MAX,
  entwurfKarte,
  freigabeKarte,
  freigabeKnoepfe,
  GRUENDE,
  istEmail,
  leseEntwurfKarte,
  leseFreigabe,
  mailInhalt,
  mitText,
  mitZustand,
  pruefeSenden,
  sauberAdresse,
  ticketBesitzer,
  ticketVerlauf,
  ZEILE_RAUS,
  zeileAbgelehnt,
  zeileGesendet,
  type Freigabe,
  type MailOrt,
} from "@/lib/mail-antwort";
import { schreibeEntwurf } from "@/lib/mail-entwurf";
import { merkeFaden } from "@/lib/mail-faeden-speicher";
import { pusheDavid } from "@/lib/ntfy";
import { DAVID_ID, nameVon } from "@/lib/team";
import { ausKarte } from "@/lib/zustaendige";

const ORTE: MailOrt[] = ["ticket", "anfrage", "kundenmail", "kunde"];
const KONTAKT = "kontakt@agentsgilt.com";
const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const DEFERRED_EPHEMERAL = { type: 5, data: { flags: 64 } };
const uhrzeit = () => new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const feldWert = (e: EmbedLike | undefined, name: string) => e?.fields?.find((f) => f.name.startsWith(name))?.value ?? "";
/** Gegen doppeltes Senden innerhalb einer Server-Instanz (dazu kommt der Zustand auf der Karte). */
const laufend = new Set<string>();

interface Kontext {
  an: string;
  frage: string;
  verlauf: string;
  betreff: string;
  berechtigt: string[];
  quelleId: string;
}

type Msg = { id: string; content?: string; embeds?: EmbedLike[] };

async function holeNachricht(token: string, kanal: string, id: string): Promise<Msg | null> {
  return call<Msg>(token, "GET", `/channels/${kanal}/messages/${id}`);
}

/** Was wir zum Mailen brauchen, je Ort. Fehler als Satz für die private Meldung. */
async function kontext(token: string, ort: MailOrt, kanal: string, quelle: Msg | null): Promise<Kontext | string> {
  if (ort === "ticket") {
    const nachrichten = (await listMessages(token, kanal, 100)).slice().reverse();
    const karte = nachrichten.find((m) => m.embeds[0]?.title?.startsWith("Support-Anfrage") && feldWert(m.embeds[0], "Kontakt"));
    if (!karte) return "Die Ticket-Karte ist nicht mehr da.";
    const e = karte.embeds[0];
    const an = sauberAdresse(feldWert(e, "Kontakt"));
    if (!istEmail(an)) return "Für dieses Ticket gibt es keine Mail-Adresse, nur die Nummer in der Karte.";
    return {
      an,
      frage: feldWert(e, "Frage"),
      verlauf: ticketVerlauf(e, nachrichten.map((m) => ({ text: m.content ?? "" }))),
      betreff: "Deine Frage im Chat bei Agents Gilt",
      berechtigt: [ticketBesitzer(e) ?? ""],
      quelleId: karte.id,
    };
  }
  if (!quelle?.embeds?.[0]) return "Die Karte ist nicht mehr aktuell.";
  const e = quelle.embeds[0];
  if (ort === "anfrage") {
    const d = datenAusKarte(e);
    if (!istEmail(sauberAdresse(d.email))) return "Diese Anfrage hat keine gültige Mail-Adresse.";
    return {
      an: sauberAdresse(d.email),
      frage: d.message,
      verlauf: [`Name: ${d.name}`, d.company && `Unternehmen: ${d.company}`, d.service && `Gewünschte Leistung: ${d.service}`, `Nachricht: ${d.message}`].filter(Boolean).join("\n"),
      betreff: "Deine Anfrage bei Agents Gilt",
      berechtigt: [besitzerId(e) ?? ""],
      quelleId: quelle.id,
    };
  }
  if (ort === "kundenmail") {
    const absender = feldWert(e, "Absender");
    const an = sauberAdresse(absender);
    if (!istEmail(an)) return "Die Mail-Adresse des Kunden ist nicht lesbar.";
    const betreff = feldWert(e, "Betreff").replace(/^\(ohne Betreff\)$/, "");
    const karte = await findeKarte(token, kanal);
    return {
      an,
      frage: clip(e.description ?? "", 1000),
      verlauf: `Betreff: ${betreff}\nMail des Kunden:\n${e.description ?? ""}`,
      betreff: betreff ? `Re: ${betreff.replace(/^(Re|AW|Aw):\s*/i, "")}` : "Deine Nachricht an Agents Gilt",
      berechtigt: ausKarte(karte?.embeds[0]) ?? [],
      quelleId: quelle.id,
    };
  }
  return "Das kommt mit der nächsten Etappe.";
}

/** Zeile fürs Team im Kanal, als Antwort auf die Karte oder Mail. */
async function zeile(token: string, kanal: string, quelleId: string, text: string): Promise<string | null> {
  const m = await call<{ id: string }>(token, "POST", `/channels/${kanal}/messages`, {
    content: text,
    message_reference: { message_id: quelleId, fail_if_not_exists: false },
    allowed_mentions: { parse: [] },
  });
  return m?.id ?? null;
}

async function aendereZeile(token: string, kanal: string, id: string, text: string) {
  if (id) await call(token, "PATCH", `/channels/${kanal}/messages/${id}`, { content: text, allowed_mentions: { parse: [] } });
}

async function versende(f: Pick<Freigabe, "an" | "frage">, betreff: string, text: string): Promise<boolean> {
  const inhalt = mailInhalt(text, f.frage);
  const res = await sendMail({ to: f.an, subject: betreff || "Nachricht von Agents Gilt", html: inhalt.html, text: inhalt.text, replyTo: KONTAKT, bcc: KONTAKT });
  return !("skipped" in res) && !("error" in res && res.error);
}

/** Nach dem Senden: Zeile fürs Team und Faden für die Antwort des Kunden. */
async function nachDemSenden(token: string, f: Pick<Freigabe, "an" | "ort" | "kanal" | "quelleId" | "zeilenId">) {
  await aendereZeile(token, f.kanal, f.zeilenId, zeileGesendet(uhrzeit()));
  await merkeFaden(token, { email: f.an, kanal: f.kanal, ort: f.ort, quelleId: f.quelleId, zeit: new Date().toISOString() });
}

const eingabe = (i: AnfInteraction, id: string) =>
  i.data?.components?.flatMap((r) => r.components ?? []).find((c) => c.custom_id === id)?.value?.trim() ?? "";

function fenster(customId: string, titel: string, betreffRoh: string, textRoh: string) {
  const { betreff, text } = fensterWerte(betreffRoh, textRoh);
  return NextResponse.json({
    type: 9,
    data: {
      custom_id: customId,
      title: titel,
      components: [
        { type: 1, components: [{ type: 4, custom_id: "betreff", label: "Betreff", style: 1, required: true, max_length: BETREFF_MAX, value: betreff || undefined }] },
        { type: 1, components: [{ type: 4, custom_id: "text", label: "Text der Mail", style: 2, required: true, max_length: TEXT_MAX, value: text || undefined }] },
      ],
    },
  });
}

async function ablehnen(token: string, kanal: string, kartenId: string, grund: string): Promise<string> {
  const m = await holeNachricht(token, kanal, kartenId);
  const karte = m?.embeds?.[0];
  const f = leseFreigabe(karte);
  if (!karte || !f || f.zustand !== "offen") return "Diese Mail ist schon erledigt.";
  await aendereKarte(token, kanal, kartenId, mitZustand(karte, "abgelehnt", `Nicht gesendet: ${grund}`), []);
  const satz = zeileAbgelehnt(grund);
  await aendereZeile(token, f.kanal, f.zeilenId, satz);
  await call(token, "POST", `/channels/${f.kanal}/messages`, {
    content: `<@${f.autor}> ${satz}`,
    message_reference: { message_id: f.zeilenId, fail_if_not_exists: false },
    allowed_mentions: { users: [f.autor] },
  });
  return "Erledigt: Die Mail geht nicht raus.";
}

export function handleMail(i: AnfInteraction, token: string | undefined) {
  const user = i.member?.user;
  const kanal = i.channel_id;
  const appId = i.application_id;
  const itoken = i.token;
  const id = i.data?.custom_id ?? "";
  if (!user || !token || !kanal || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");
  const antwort = (text: string, components: unknown[] = []) => setzeAntwort(appId, itoken, text, components);
  const teile = id.split(":");
  const was = teile[1];

  // ---- 📧 Knopf gedrückt: Entwurf schreiben (privat)
  if (was === "start") {
    const ort = teile[2] as MailOrt;
    if (!ORTE.includes(ort)) return ephemeral("Unbekannter Knopf.");
    // Hängt der Knopf nicht an der Karte selbst (z. B. an einer Antwort per Mail), steht ihre Kennung im Knopf.
    const quelleId = teile[3];
    const hier = i.message ? { id: i.message.id, embeds: i.message.embeds } : null;
    after(async () => {
      const quelle = quelleId ? await holeNachricht(token, kanal, quelleId) : hier;
      const k = await kontext(token, ort, kanal, quelle);
      if (typeof k === "string") return void (await antwort(k));
      const verbot = darfMailen(ort, user.id, k.berechtigt, DAVID_ID);
      if (verbot) return void (await antwort(verbot));
      const vorname = (nameVon(user.id) ?? user.global_name ?? user.username ?? "").split(" ")[0];
      const e = await schreibeEntwurf({ ort, verlauf: k.verlauf, vorname });
      const karte = entwurfKarte(e ? { ...e, betreff: e.betreff || k.betreff } : null, k.an);
      await fetch(`https://discord.com/api/v10/webhooks/${appId}/${itoken}/messages/@original`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: e ? "Prüf den Entwurf und pass ihn an. Erst dann geht er zur Freigabe." : "",
          embeds: [karte],
          components: [{ type: 1, components: [{ type: 2, style: 1, label: "Bearbeiten & senden", emoji: { name: "✏️" }, custom_id: `mail:edit:${ort}:${k.quelleId}` }] }],
          allowed_mentions: { parse: [] },
        }),
        signal: AbortSignal.timeout(8000),
      }).catch((err) => console.error("[mail] Entwurf anzeigen fehlgeschlagen:", err));
    });
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  // ---- ✏️ Bearbeiten & senden: Fenster mit dem Entwurf
  if (was === "edit") {
    const [, , ort, quelleId] = teile;
    const e = leseEntwurfKarte(i.message?.embeds?.[0]);
    return fenster(`mail:send:${ort}:${quelleId}`, "Mail an den Kunden", e.betreff, e.text);
  }

  // ---- Fenster abgeschickt: zur Freigabe (Team) oder gleich senden (David)
  if (was === "send" && i.type === 5) {
    const [, , ortRoh, quelleId] = teile;
    const ort = ortRoh as MailOrt;
    const betreff = eingabe(i, "betreff");
    const text = eingabe(i, "text");
    if (!text) return ephemeral("Die Mail war leer.");
    after(async () => {
      const quelle = ort === "ticket" ? null : await holeNachricht(token, kanal, quelleId);
      const k = await kontext(token, ort, kanal, quelle);
      if (typeof k === "string") return void (await antwort(k));
      const verbot = darfMailen(ort, user.id, k.berechtigt, DAVID_ID);
      if (verbot) return void (await antwort(verbot));
      if (user.id === DAVID_ID) {
        if (!(await versende(k, betreff, text))) return void (await antwort("⚠️ Die Mail konnte nicht gesendet werden. Bitte gleich nochmal versuchen."));
        const zeilenId = (await zeile(token, kanal, k.quelleId, zeileGesendet(uhrzeit()))) ?? "";
        await merkeFaden(token, { email: k.an, kanal, ort, quelleId: k.quelleId, zeit: new Date().toISOString() });
        return void (await antwort(zeilenId ? "✅ Gesendet." : "✅ Gesendet (die Zeile im Kanal fehlt)."));
      }
      const zeilenId = await zeile(token, kanal, k.quelleId, ZEILE_RAUS);
      const posteingang = await posteingangKanal(token);
      if (!zeilenId || !posteingang) return void (await antwort("⚠️ Das hat gerade nicht geklappt. Bitte nochmal versuchen."));
      const auftrag = { ort, kanal, quelleId: k.quelleId, an: k.an, betreff: betreff || k.betreff, frage: k.frage, autor: user.id };
      const kartenId = await postKarte(token, posteingang, freigabeKarte(auftrag, text, zeilenId), freigabeKnoepfe("offen"));
      if (!kartenId) return void (await antwort("⚠️ Das hat gerade nicht geklappt. Bitte nochmal versuchen."));
      const vorname = (nameVon(user.id) ?? user.global_name ?? user.username ?? "Jemand").split(" ")[0];
      await pusheDavid("📧 Mail zur Freigabe", `${vorname} an ${k.an}`, messageLink(posteingang, kartenId));
      await antwort(ZEILE_RAUS);
    });
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  // ---- Ab hier: Freigabe-Karte in #posteingang, nur David
  if (user.id !== DAVID_ID) return ephemeral("Das geht hier nicht.");

  if (was === "ok") {
    const karte = i.message?.embeds?.[0];
    const kartenId = i.message?.id;
    const nein = pruefeSenden(karte);
    if (nein || !karte || !kartenId) return ephemeral(nein ?? "Diese Karte ist nicht mehr aktuell.");
    if (laufend.has(kartenId)) return ephemeral("Diese Mail wird gerade gesendet.");
    laufend.add(kartenId);
    const f = leseFreigabe(karte)!;
    after(async () => {
      try {
        if (!(await versende(f, f.betreff, f.text))) {
          await aendereKarte(token, kanal, kartenId, { ...karte, fields: [...(karte.fields ?? []), { name: "⚠️", value: "Senden ging nicht. Bitte nochmal versuchen." }] }, freigabeKnoepfe("offen"));
          return;
        }
        await nachDemSenden(token, f);
      } finally {
        laufend.delete(kartenId);
      }
    });
    return NextResponse.json({ type: 7, data: { embeds: [mitZustand(karte, "gesendet", `✅ Gesendet um ${uhrzeit()}`)], components: [], allowed_mentions: { parse: [] } } });
  }

  if (was === "aendern") {
    const f = leseFreigabe(i.message?.embeds?.[0]);
    if (!f || f.zustand !== "offen" || !i.message) return ephemeral("Diese Mail ist schon erledigt.");
    return fenster(`mail:aendernsend:${i.message.id}`, "Mail ändern und senden", f.betreff, f.text);
  }

  if (was === "aendernsend" && i.type === 5) {
    const kartenId = teile[2];
    const betreff = eingabe(i, "betreff");
    const text = eingabe(i, "text");
    if (!text) return ephemeral("Die Mail war leer.");
    if (laufend.has(kartenId)) return ephemeral("Diese Mail wird gerade gesendet.");
    laufend.add(kartenId);
    after(async () => {
      try {
        const m = await holeNachricht(token, kanal, kartenId);
        const karte = m?.embeds?.[0];
        const f = leseFreigabe(karte);
        if (!karte || !f || f.zustand !== "offen") return void (await antwort("Diese Mail ist schon erledigt."));
        if (!(await versende(f, betreff, text))) return void (await antwort("⚠️ Senden ging nicht. Bitte nochmal versuchen."));
        const neu = { ...mitText(karte, text), fields: (karte.fields ?? []).map((x) => (x.name === "Betreff" ? { ...x, value: clip(betreff, 200) } : x)) };
        await aendereKarte(token, kanal, kartenId, mitZustand(neu, "gesendet", `✅ Geändert und gesendet um ${uhrzeit()}`), []);
        await nachDemSenden(token, f);
        await antwort("✅ Geändert und gesendet.");
      } finally {
        laufend.delete(kartenId);
      }
    });
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  if (was === "nein") {
    const kartenId = i.message?.id;
    if (!kartenId || pruefeSenden(i.message?.embeds?.[0])) return ephemeral("Diese Mail ist schon erledigt.");
    return NextResponse.json({
      type: 4,
      data: {
        flags: 64,
        content: "Warum geht die Mail nicht raus? Das Teammitglied sieht nur den Grund.",
        components: [
          {
            type: 1,
            components: [{ type: 3, custom_id: `mail:grund:${kartenId}`, placeholder: "Grund wählen", options: GRUENDE.map((g, n) => ({ label: g, value: String(n) })) }],
          },
        ],
      },
    });
  }

  if (was === "grund") {
    const kartenId = teile[2];
    const n = Number(i.data?.values?.[0]);
    if (!(n >= 0 && n < GRUENDE.length)) return ephemeral("Bitte einen Grund wählen.");
    if (n === GRUENDE.length - 1) {
      return NextResponse.json({
        type: 9,
        data: {
          custom_id: `mail:grundtext:${kartenId}`,
          title: "Grund für das Team",
          components: [{ type: 1, components: [{ type: 4, custom_id: "grund", label: "Grund (sieht nur das Teammitglied)", style: 2, required: true, max_length: 300 }] }],
        },
      });
    }
    after(async () => void (await antwort(await ablehnen(token, kanal, kartenId, GRUENDE[n]))));
    return NextResponse.json({ type: 7, data: { content: "Einen Moment …", components: [] } });
  }

  if (was === "grundtext" && i.type === 5) {
    const kartenId = teile[2];
    const grund = eingabe(i, "grund");
    if (!grund) return ephemeral("Der Grund war leer.");
    after(async () => void (await antwort(await ablehnen(token, kanal, kartenId, clip(grund, 300)))));
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  return ephemeral("Unbekannter Knopf.");
}
