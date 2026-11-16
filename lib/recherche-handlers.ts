// Recherche-Thread an Lead-Karten (Etappe 3, 16.11.2026, Davids Wünsche):
// - „In Arbeit“ legt einen privaten Thread „🔎 <Firma> · Recherche“ in #leads an (Zuständiger und David).
//   Die Mappe selbst baut der Team-Takt (lib/team-takt.ts) in der nächsten Minute: Sie braucht 20 bis 40 Sekunden,
//   das passt nicht in einen Knopfdruck, und so wird es bei einem Fehler einfach noch einmal versucht.
// - „👥 Einladen“ holt jemanden aus dem Team dazu (lesen und fragen; die Status-Knöpfe bleiben beim Zuständigen).
// - Fragen tippt man in den Thread, der Takt antwortet.
// - Freigeben, Aussortieren, Kein Interesse: Thread zu. „Lead aktiv“: Mappe und Verlauf auf die Notion-Seite, Thread zu;
//   der Takt kopiert beides als gesperrten Thread „🔎 Recherche“ in den Kundenkanal, sobald es ihn gibt (lib/recherche-umzug.ts).
// - Zurück auf „Offen“: Thread nur einklappen. Wieder „In Arbeit“: derselbe Thread, ab 30 Tagen alter Mappe eine neue.
// Reine Regeln: lib/lead-arbeit.ts, lib/recherche-mappe.ts.
import { NextResponse } from "next/server";
import type { AnfInteraction } from "@/lib/anfrage-handlers";
import type { EmbedLike } from "@/lib/discord-calls";
import { eigeneId } from "@/lib/kundenkanal";
import { alleNachrichten, besitzerId, call, kartenKanal, statusWort } from "@/lib/leads";
import { mitRecherche, nachhakenFaellig, nachhakText, offeneFragen, rechercheThread, schonNachgehakt } from "@/lib/lead-arbeit";
import { haengeAn } from "@/lib/notion-api";
import { beantworteFrage, erstelleMappe } from "@/lib/recherche";
import { embedsAlsText, istMappe, mappeEmbeds } from "@/lib/recherche-mappe";
import { findChannelId } from "@/lib/discord";
import { kanalName } from "@/lib/notion-kunden";
import { aktuelleMappe, FEHLVERSUCH, kundenNrAus, mappeVeraltet, mitUmzug, NEUE_MAPPE, PLATZHALTER, teileText, umzugFaellig, verlaufZeilen } from "@/lib/recherche-umzug";
import { aktive, DAVID_ID, nameVon } from "@/lib/team";
import { zeitAusId } from "@/lib/team-takt-regeln";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1564355422222159975";
const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const ohneNull = (s: string) => s.replace(/​/g, "");

type Msg = { id: string; content?: string; author?: { id?: string; bot?: boolean }; embeds?: EmbedLike[]; components?: unknown[] };

const einladenKnopf = (karteId: string) => [
  { type: 1, components: [{ type: 2, style: 2, label: "Einladen", emoji: { name: "👥" }, custom_id: `rch:einladen:${karteId}` }] },
];

/** „In Arbeit“: Thread anlegen (oder den alten wieder öffnen) und auf der Karte verlinken. Läuft in after(). */
export async function starteRecherche(token: string, leadsKanal: string, karteId: string, besitzer: string): Promise<void> {
  const m = await call<Msg>(token, "GET", `/channels/${leadsKanal}/messages/${karteId}`);
  const e = m?.embeds?.[0];
  if (!e) return;
  const alt = rechercheThread(e);
  if (alt && (await call(token, "PATCH", `/channels/${alt}`, { archived: false, locked: false }))) {
    await call(token, "PUT", `/channels/${alt}/thread-members/${besitzer}`);
    // Alte Mappe (ab 30 Tagen): Hinweis setzen, dann baut der Takt eine neue. Ohne Mappe baut er ohnehin.
    const msgs = await liesThread(token, alt);
    const { mappeId } = aktuelleMappe(msgs.map((m) => ({ id: m.id, mappe: istMappe(m.embeds?.[0]), text: m.content ?? "" })));
    if (mappeId && mappeVeraltet(mappeId, Date.now())) {
      await call(token, "POST", `/channels/${alt}/messages`, {
        content: `${NEUE_MAPPE}, ich stelle <@${besitzer}> eine neue zusammen (etwa eine Minute).`,
        allowed_mentions: { users: [besitzer] },
      });
    }
    return;
  }
  const firma = ohneNull(e.title ?? "Firma");
  const thread = await call<{ id: string }>(token, "POST", `/channels/${leadsKanal}/threads`, {
    name: `🔎 ${firma} · Recherche`.slice(0, 100),
    type: 12,
    invitable: false,
    auto_archive_duration: 10080,
  });
  if (!thread) {
    console.error("[recherche] Thread anlegen fehlgeschlagen");
    return;
  }
  for (const id of new Set([besitzer, DAVID_ID])) await call(token, "PUT", `/channels/${thread.id}/thread-members/${id}`);
  await call(token, "POST", `/channels/${thread.id}/messages`, {
    content: `<@${besitzer}> ${PLATZHALTER} zu **${firma.replace(/[*_~\`|>]/g, "")}**, das dauert etwa eine Minute. Fragen kannst du danach einfach hier stellen.`,
    allowed_mentions: { users: [besitzer] },
  });
  // Karte neu lesen: Der Status hat sich gerade geändert, er soll bleiben.
  const neu = await call<Msg>(token, "GET", `/channels/${leadsKanal}/messages/${karteId}`);
  if (neu?.embeds?.[0]) {
    await call(token, "PATCH", `/channels/${leadsKanal}/messages/${karteId}`, {
      embeds: [mitRecherche(neu.embeds[0], thread.id)],
      components: neu.components ?? [],
      allowed_mentions: { parse: [] },
    });
  }
}

/** Zurück auf „Offen“: Thread einklappen, nicht sperren und nicht löschen (bei „In Arbeit“ geht er wieder auf). */
export async function klappeRechercheEin(token: string, threadId: string | null): Promise<void> {
  if (threadId) await call(token, "PATCH", `/channels/${threadId}`, { archived: true });
}

/** Alle Nachrichten eines Threads in zeitlicher Reihenfolge (höchstens 100). */
async function liesThread(token: string, threadId: string): Promise<Msg[]> {
  return ((await call<Msg[]>(token, "GET", `/channels/${threadId}/messages?limit=100`)) ?? []).slice().reverse();
}

const mappeUndVerlauf = (msgs: Msg[]) => {
  const { mappeId } = aktuelleMappe(msgs.map((m) => ({ id: m.id, mappe: istMappe(m.embeds?.[0]), text: m.content ?? "" })));
  const mappe = msgs.find((m) => m.id === mappeId) ?? null;
  const verlauf = verlaufZeilen(
    msgs.filter((m) => !istMappe(m.embeds?.[0])).map((m) => ({ bot: Boolean(m.author?.bot), name: m.author?.bot ? "Bot" : (nameVon(m.author?.id ?? "") ?? "Team"), text: m.content ?? "" })),
  );
  return { mappe, verlauf };
};

/** Thread schließen (Freigeben, Aussortieren, Kein Interesse, Lead aktiv). */
export async function schliesseRecherche(token: string, threadId: string | null): Promise<void> {
  if (threadId) await call(token, "PATCH", `/channels/${threadId}`, { archived: true, locked: true });
}

const block = (typ: "heading_3" | "paragraph", text: string) => ({
  object: "block",
  type: typ,
  [typ]: { rich_text: [{ type: "text", text: { content: text.slice(0, 1900) } }] },
});

/** „Lead aktiv“: Mappe und Fragen/Antworten auf die neue Notion-Seite. */
export async function rechercheNachNotion(token: string, threadId: string | null, notionUrl: string): Promise<boolean> {
  if (!threadId) return false;
  const { mappe, verlauf } = mappeUndVerlauf(await liesThread(token, threadId));
  if (!mappe?.embeds && verlauf.length === 0) return false;
  const absaetze = mappe?.embeds ? embedsAlsText(mappe.embeds).split(/\n\n/).filter(Boolean) : [];
  return Boolean(
    await haengeAn(notionUrl, [
      block("heading_3", "🔎 Recherche-Mappe (aus Discord)"),
      ...absaetze.map((t) => block("paragraph", t)),
      ...(verlauf.length ? [block("heading_3", "💬 Fragen und Antworten"), ...teileText(verlauf).map((t) => block("paragraph", t))] : []),
    ]),
  );
}

/** Kopie der Recherche als gesperrter Thread im Kundenkanal. Gibt die Thread-ID zurück. */
async function kopiereInKundenkanal(token: string, kanal: string, original: string, firma: string, besitzer: string | null): Promise<string | null> {
  const { mappe, verlauf } = mappeUndVerlauf(await liesThread(token, original));
  const name = firma.replace(/[*_~`|>]/g, "");
  const start = await call<{ id: string }>(token, "POST", `/channels/${kanal}/messages`, {
    content: `🔎 **Recherche zu ${name}** aus #leads: Mappe${verlauf.length ? " und Fragen" : ""} im Thread.${besitzer ? ` Den Lead hatte <@${besitzer}>.` : ""}`,
    allowed_mentions: { parse: [] },
  });
  if (!start) return null;
  const thread = await call<{ id: string }>(token, "POST", `/channels/${kanal}/messages/${start.id}/threads`, {
    name: `🔎 Recherche · ${firma}`.slice(0, 100),
    auto_archive_duration: 10080,
  });
  if (!thread) return null;
  const post = (body: Record<string, unknown>) => call(token, "POST", `/channels/${thread.id}/messages`, { ...body, allowed_mentions: { parse: [] } });
  if (mappe?.embeds?.length) await post({ embeds: mappe.embeds.slice(0, 10) });
  if (verlauf.length) {
    const teile = teileText(verlauf);
    teile[0] = `💬 **Fragen und Antworten**\n${teile[0]}`.slice(0, 2000);
    for (const t of teile) await post({ content: t });
  }
  await post({ content: `Original (nur für die Zuständigen sichtbar): <#${original}>` });
  await call(token, "PATCH", `/channels/${thread.id}`, { locked: true });
  return thread.id;
}

/** Ein Takt: höchstens eine Recherche von „Lead aktiv“ in den Kundenkanal kopieren (sobald es ihn gibt). */
async function rechercheUmzug(token: string, leads: string, karten: LeadKarte[]): Promise<number> {
  for (const k of karten) {
    if (!umzugFaellig(k.embed, statusWort(k.embed))) continue;
    const kanal = await findChannelId(token, kanalName(kundenNrAus(k.embed)!));
    if (!kanal) continue; // Notion legt den Kanal gleich an, nächster Takt
    const neu = await kopiereInKundenkanal(token, kanal, k.thread, ohneNull(k.embed.title ?? "Firma"), besitzerId(k.embed));
    if (!neu) {
      console.error(`[recherche] Kopie in den Kundenkanal fehlgeschlagen (${k.id})`);
      return 0;
    }
    const m = await call<Msg>(token, "GET", `/channels/${leads}/messages/${k.id}`);
    if (m?.embeds?.[0]) {
      await call(token, "PATCH", `/channels/${leads}/messages/${k.id}`, { embeds: [mitUmzug(m.embeds[0], neu)], components: m.components ?? [], allowed_mentions: { parse: [] } });
    }
    return 1;
  }
  return 0;
}

// ------------------------------------------------------------------ Knöpfe im Thread (rch:)

export async function handleRecherche(i: AnfInteraction, token: string | undefined) {
  const user = i.member?.user;
  const kanal = i.channel_id;
  const id = i.data?.custom_id ?? "";
  if (!user || !token || !kanal) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");

  if (id.startsWith("rch:einladen:")) {
    const karteId = id.slice("rch:einladen:".length);
    const leads = await kartenKanal(token);
    const karte = leads ? (await call<Msg>(token, "GET", `/channels/${leads}/messages/${karteId}`))?.embeds?.[0] : null;
    const besitzer = karte ? besitzerId(karte) : null;
    if (user.id !== besitzer && user.id !== DAVID_ID) return ephemeral("Einladen kann nur, wer den Lead übernommen hat (oder David).");
    const wahl = aktive().filter((m) => m.discord !== user.id && m.discord !== besitzer && m.discord !== DAVID_ID);
    if (wahl.length === 0) return ephemeral("Gerade ist niemand sonst im Team, den du einladen könntest.");
    return NextResponse.json({
      type: 4,
      data: {
        flags: 64,
        content: "👥 Wen möchtest du dazuholen? Eingeladene lesen mit und dürfen fragen.",
        components: [
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: `rch:wer:${kanal}`,
                placeholder: "Aus dem Team wählen",
                min_values: 1,
                max_values: Math.min(wahl.length, 5),
                options: wahl.slice(0, 25).map((m) => ({ label: m.name, value: m.discord })),
              },
            ],
          },
        ],
      },
    });
  }

  if (id.startsWith("rch:wer:")) {
    const thread = id.slice("rch:wer:".length);
    const ids = (i.data?.values ?? []).filter((v) => /^\d{15,20}$/.test(v)).slice(0, 5);
    if (ids.length === 0) return ephemeral("Bitte jemanden auswählen.");
    const dabei: string[] = [];
    for (const x of ids) if (await call(token, "PUT", `/channels/${thread}/thread-members/${x}`)) dabei.push(x);
    if (dabei.length) {
      await call(token, "POST", `/channels/${thread}/messages`, {
        content: `👥 ${dabei.map((x) => `<@${x}>`).join(", ")} ${dabei.length === 1 ? "ist" : "sind"} dazugekommen (eingeladen von ${nameVon(user.id) ?? "jemandem aus dem Team"}).`,
        allowed_mentions: { users: dabei },
      });
    }
    return NextResponse.json({ type: 7, data: { content: dabei.length ? "✅ Eingeladen." : "⚠️ Das hat nicht geklappt.", components: [] } });
  }

  return ephemeral("Unbekannter Knopf.");
}

// ------------------------------------------------------------------ Team-Takt: Mappen, Fragen, Nachhaken

type LeadKarte = { id: string; embed: EmbedLike; thread: string };

async function rechercheKarten(token: string, leads: string): Promise<LeadKarte[]> {
  return (await alleNachrichten(token, leads, 300))
    .map((m) => ({ id: m.id, embed: m.embeds?.[0] as EmbedLike, thread: rechercheThread(m.embeds?.[0]) ?? "" }))
    .filter((k) => k.embed && k.thread);
}

async function aktiveThreads(token: string, leads: string): Promise<{ id: string; name: string }[]> {
  const r = await call<{ threads?: { id: string; name: string; parent_id?: string }[] }>(token, "GET", `/guilds/${GUILD_ID}/threads/active`);
  return (r?.threads ?? []).filter((t) => t.parent_id === leads && t.name.startsWith("🔎"));
}

const feldOhne = (e: EmbedLike, name: string) => {
  const v = e.fields?.find((x) => x.name === name)?.value;
  return v && v !== "nicht gefunden" ? ohneNull(v) : null;
};

/** Ein Takt: höchstens eine neue Mappe, Antworten auf offene Fragen, einmal nachhaken nach 2 Tagen. */
export async function rechercheTakt(
  token: string,
  jetzt: number,
  leads: string | null,
): Promise<{ mappen: number; antworten: number; nachgehakt: number; kopiert: number }> {
  if (!leads) return { mappen: 0, antworten: 0, nachgehakt: 0, kopiert: 0 };
  const [threads, karten, botId] = await Promise.all([aktiveThreads(token, leads), rechercheKarten(token, leads), eigeneId(token)]);
  let mappen = 0;
  let antworten = 0;
  let nachgehakt = 0;

  for (const t of threads) {
    const karte = karten.find((k) => k.thread === t.id);
    const msgs = await liesThread(token, t.id);
    const stand = aktuelleMappe(msgs.map((m) => ({ id: m.id, mappe: istMappe(m.embeds?.[0]), text: m.content ?? "" })));
    const mappe = msgs.find((m) => m.id === stand.mappeId);

    // Mappe fehlt noch (oder ist nach dem Hinweis „älter als 30 Tage“ neu fällig): bauen, eine je Takt, höchstens zwei Fehlversuche
    if (!mappe) {
      const versuche = stand.fehlversuche;
      if (mappen + antworten > 0 || versuche >= 2 || !karte) continue;
      mappen++;
      const e = karte.embed;
      const firma = ohneNull(e.title ?? "Firma");
      const website = e.description?.match(/🔗\s*(\S+)/)?.[1] ?? null;
      const analyse = [
        ohneNull((e.description ?? "").split("\n\n🔗")[0]),
        feldOhne(e, "Auffällig an der Website") && `Auffällig an der Website:\n${feldOhne(e, "Auffällig an der Website")}`,
        feldOhne(e, "Passt zu") && `Passt zu: ${feldOhne(e, "Passt zu")}`,
        feldOhne(e, "Ansprechpartner") && `Ansprechpartner: ${feldOhne(e, "Ansprechpartner")}`,
        feldOhne(e, "Telefon") && `Telefon: ${feldOhne(e, "Telefon")}`,
      ]
        .filter(Boolean)
        .join("\n");
      const m = await erstelleMappe(token, { firma, website, adresse: feldOhne(e, "Adresse"), analyse, branche: feldOhne(e, "Branche") });
      await call(
        token,
        "POST",
        `/channels/${t.id}/messages`,
        m
          ? { embeds: mappeEmbeds(m, firma), components: einladenKnopf(karte.id), allowed_mentions: { parse: [] } }
          : { content: `${FEHLVERSUCH}. ${versuche === 0 ? "Ich versuche es gleich noch einmal." : `Schau dir die Firma bitte selbst an${website ? `: ${website}` : "."}`}`, allowed_mentions: { parse: [] } },
      );
      continue;
    }

    // Offene Fragen beantworten
    const fragen = offeneFragen(
      msgs.map((m) => ({ id: m.id, autorId: m.author?.id ?? "", bot: Boolean(m.author?.bot), text: m.content ?? "" })),
      botId ?? "",
    );
    // Höchstens eine schwere Arbeit je Takt (Mappe oder Antwort mit Websuche), sonst reichen die 60 Sekunden nicht.
    if (fragen.length && mappen + antworten === 0) {
      const verlauf = msgs
        .filter((m) => m.content)
        .slice(-12)
        .map((m) => `${m.author?.bot ? "Bot" : (nameVon(m.author?.id ?? "") ?? "Team")}: ${m.content}`)
        .join("\n");
      const antwort = await beantworteFrage(embedsAlsText(mappe.embeds ?? []), verlauf, fragen.map((f) => f.text).join("\n"), {
        name: ohneNull(karte?.embed.title ?? t.name.replace(/^🔎\s*/, "").replace(/\s*·\s*Recherche$/, "")),
        adresse: karte ? feldOhne(karte.embed, "Adresse") : null,
      });
      if (antwort) {
        await call(token, "POST", `/channels/${t.id}/messages`, {
          content: antwort,
          message_reference: { message_id: fragen[fragen.length - 1].id, fail_if_not_exists: false },
          allowed_mentions: { parse: [] },
        });
        antworten++;
      }
    }

    // Nach 2 Tagen „In Arbeit“ einmal nachhaken
    if (karte && statusWort(karte.embed) === "In Arbeit") {
      const besitzer = besitzerId(karte.embed);
      if (besitzer && nachhakenFaellig(zeitAusId(t.id), jetzt, schonNachgehakt(msgs.map((m) => m.content ?? "")))) {
        await call(token, "POST", `/channels/${t.id}/messages`, {
          content: nachhakText(ohneNull(karte.embed.title ?? "die Firma").replace(/[*_~`|>]/g, ""), besitzer),
          allowed_mentions: { users: [besitzer] },
        });
        nachgehakt++;
      }
    }
  }
  // Kopieren in den Kundenkanal nur, wenn dieser Takt sonst nichts Schweres gemacht hat
  const kopiert = mappen + antworten === 0 ? await rechercheUmzug(token, leads, karten) : 0;
  return { mappen, antworten, nachgehakt, kopiert };
}
