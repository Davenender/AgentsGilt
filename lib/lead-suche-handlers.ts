import { after, NextResponse } from "next/server";
import { editInteractionOriginal } from "@/lib/discord";
import type { EmbedLike } from "@/lib/discord-calls";
import {
  analyseFuer,
  erzeugeCode,
  gibSucheZurueck,
  kontingent,
  loeseCodeEin,
  MAX_BRANCHEN,
  MAX_SUCHEN,
  merkeGesehen,
  SITZUNG_MIN,
  sitzungBis,
  starteSitzung,
  STANDARD,
  sucheFirmen,
  verbrauchSuche,
  zusatzFelder,
  type Einstellungen,
  type Kontingent,
  type Sortierung,
  type WebFilter,
} from "@/lib/lead-suche";
import {
  call,
  COLOR,
  findeBestehend,
  FOOTER_HINWEIS,
  F_NO,
  F_YES,
  kartenEmbed,
  kartenKanal,
  leadComponents,
  NEEDED,
  postKarte,
  SEP,
  sucheKanal,
  teamRolle,
  letzterFehler,
} from "@/lib/leads";
import { SHOW_NAMES } from "@/lib/support";

// Bedienung der Lead-Suche in Discord (Kanal #lead-suche). Alles läuft über Knöpfe, Auswahlfelder
// und kleine Fenster. Die Suchzentrale ist eine private Nachricht (nur für den, der geklickt hat).
// Ihr Zustand steckt im Fuß der Nachricht, so braucht es keine Datenbank.

export interface SucheInteraction {
  type: number;
  token?: string;
  application_id?: string;
  channel_id?: string;
  data?: {
    custom_id?: string;
    values?: string[];
    components?: { components?: { custom_id: string; value?: string }[] }[];
  };
  member?: { user?: { id: string; username?: string; global_name?: string | null } };
  message?: { id: string; embeds?: EmbedLike[] };
}

const ephemeral = (content: string) =>
  NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });

const update = (embeds: EmbedLike[], components: unknown[], content = "") =>
  NextResponse.json({ type: 7, data: { content, embeds, components, allowed_mentions: { parse: [] } } });

const sek = (ms: number) => Math.floor(ms / 1000);
const zeit = (ms: number, stil: "R" | "t" | "f" = "R") => `<t:${sek(ms)}:${stil}>`;

const BRANCHEN: [string, string][] = [
  ["Friseur", "Friseur"],
  ["Barbier", "Barbershop"],
  ["Kosmetikstudio", "Kosmetikstudio"],
  ["Nagelstudio", "Nagelstudio"],
  ["Massage", "Massagepraxis"],
  ["Physiotherapie", "Physiotherapie"],
  ["Heilpraktiker", "Heilpraktiker"],
  ["Fitnessstudio", "Fitnessstudio"],
  ["Yoga & Pilates", "Yogastudio"],
  ["Restaurant", "Restaurant"],
  ["Café", "Café"],
  ["Bäckerei", "Bäckerei"],
  ["Metzgerei", "Metzgerei"],
  ["Blumenladen", "Blumenladen"],
  ["Handwerker", "Handwerker"],
  ["Maler", "Malerbetrieb"],
  ["Elektriker", "Elektriker"],
  ["Sanitär & Heizung", "Sanitär Heizung"],
  ["Schreiner", "Schreinerei"],
  ["Autowerkstatt", "Autowerkstatt"],
  ["Autohaus", "Autohaus"],
  ["Zahnarzt", "Zahnarzt"],
  ["Tierarzt", "Tierarzt"],
  ["Steuerberater", "Steuerberater"],
  ["Fahrschule", "Fahrschule"],
];
const RADIEN = [1, 2, 3, 5, 10, 15, 20, 30, 40, 50];
const WEB_TEXT: Record<WebFilter, string> = {
  keine: "Ohne Website",
  social: "Nur Facebook/Verzeichnis als Website",
  schlecht: "Schlechte oder veraltete Website",
  alle: "Gute Website (alle anderen)",
};
const SORT_TEXT: Record<Sortierung, string> = {
  empfohlen: "Empfohlen (ohne Website und viele Bewertungen zuerst)",
  meiste: "Meiste Bewertungen",
  beste: "Beste Bewertung",
  naechste: "Nächste Entfernung",
};

// ----------------------------------------------------------- Zustand im Fuß

interface Zustand extends Einstellungen {
  bis: number; // Freischaltung endet
  frei: number;
  naechste: number | null;
}

const ZUSTAND_PREFIX = "ls:";

function lesZustand(embed: EmbedLike | undefined): Zustand | null {
  const t = embed?.footer?.text;
  if (!t?.startsWith(ZUSTAND_PREFIX)) return null;
  try {
    const j = JSON.parse(t.slice(ZUSTAND_PREFIX.length)) as Record<string, unknown>;
    return {
      ort: String(j.o ?? STANDARD.ort),
      radius: Number(j.r ?? STANDARD.radius),
      branchen: Array.isArray(j.b) ? (j.b as string[]) : [],
      eigene: Array.isArray(j.x) ? (j.x as string[]) : [],
      web: Array.isArray(j.w) ? (j.w as WebFilter[]) : STANDARD.web,
      sort: (j.s as Sortierung) ?? STANDARD.sort,
      ungesehene: j.u !== 0,
      minBewertung: Number(j.mr ?? 0),
      minAnzahl: Number(j.mc ?? STANDARD.minAnzahl),
      bis: Number(j.t ?? 0),
      frei: Number(j.f ?? 0),
      naechste: j.n ? Number(j.n) : null,
    };
  } catch {
    return null;
  }
}

function schreibeZustand(z: Zustand): string {
  return (
    ZUSTAND_PREFIX +
    JSON.stringify({ o: z.ort, r: z.radius, b: z.branchen, x: z.eigene, w: z.web, s: z.sort, u: z.ungesehene ? 1 : 0, mr: z.minBewertung, mc: z.minAnzahl, t: z.bis, f: z.frei, n: z.naechste })
  );
}

// -------------------------------------------------------------- Darstellung

function zentrale(z: Zustand, hinweis = ""): { embeds: EmbedLike[]; components: unknown[] } {
  const namen = [...z.branchen.map((b) => BRANCHEN.find(([, v]) => v === b)?.[0] ?? b), ...z.eigene];
  const frei = `**${z.frei} von ${MAX_SUCHEN}** Suchen frei` + (z.naechste ? ` · nächste wieder frei ${zeit(z.naechste)}` : "");
  const embed: EmbedLike = {
    title: "🔎 Lead-Suche",
    description:
      (hinweis ? `${hinweis}\n\n` : "") +
      `Freigeschaltet bis ${zeit(z.bis, "t")} · endet ${zeit(z.bis)}\n${frei}\n\n` +
      "Stell unten alles ein und drück **Suche starten**. Die Treffer kommen in einen **privaten Thread**, den nur du siehst.",
    color: 0xd4a23c,
    fields: [
      { name: "Ort", value: `${z.ort} · Umkreis ${z.radius} km`, inline: true },
      { name: "Branchen", value: namen.length ? namen.join(", ") : "– bitte wählen –", inline: true },
      { name: "Website", value: z.web.length ? z.web.map((w) => WEB_TEXT[w]).join("\n") : "–", inline: false },
      { name: "Sortierung", value: SORT_TEXT[z.sort], inline: true },
      { name: "Nur ungesehene", value: z.ungesehene ? "an" : "aus", inline: true },
      {
        name: "Mindest-Bewertung",
        value: `${z.minBewertung > 0 ? `ab ${String(z.minBewertung).replace(".", ",")} ★` : "egal"} · mindestens ${z.minAnzahl} Bewertungen`,
        inline: true,
      },
    ],
    footer: { text: schreibeZustand(z) },
  };
  const rows = [
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: "ls:branche",
          placeholder: `Branchen wählen (höchstens ${MAX_BRANCHEN} insgesamt)`,
          min_values: 0,
          max_values: BRANCHEN.length,
          options: BRANCHEN.map(([label, wert]) => ({ label, value: wert, default: z.branchen.includes(wert) })),
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: "ls:radius",
          placeholder: "Umkreis",
          options: RADIEN.map((r) => ({ label: `${r} km`, value: String(r), default: r === z.radius })),
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: "ls:web",
          placeholder: "Welche Websites?",
          min_values: 1,
          max_values: 4,
          options: (Object.keys(WEB_TEXT) as WebFilter[]).map((w) => ({ label: WEB_TEXT[w], value: w, default: z.web.includes(w) })),
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: "ls:sort",
          placeholder: "Sortierung",
          options: (Object.keys(SORT_TEXT) as Sortierung[]).map((s) => ({ label: SORT_TEXT[s].slice(0, 100), value: s, default: s === z.sort })),
        },
      ],
    },
    {
      type: 1,
      components: [
        { type: 2, style: 2, label: "Ort & Filter ändern", custom_id: "ls:ort" },
        { type: 2, style: z.ungesehene ? 1 : 2, label: `Nur ungesehene: ${z.ungesehene ? "AN" : "AUS"}`, custom_id: "ls:ung" },
        { type: 2, style: 3, label: "Suche starten", custom_id: "ls:go" },
      ],
    },
  ];
  return { embeds: [embed], components: rows };
}

const modal = (customId: string, title: string, felder: { id: string; label: string; value?: string; placeholder?: string; required?: boolean; max?: number }[]) => ({
  type: 9,
  data: {
    custom_id: customId,
    title,
    components: felder.map((f) => ({
      type: 1,
      components: [
        {
          type: 4,
          custom_id: f.id,
          label: f.label,
          style: 1,
          required: f.required ?? false,
          max_length: f.max ?? 100,
          ...(f.value ? { value: f.value } : {}),
          ...(f.placeholder ? { placeholder: f.placeholder } : {}),
        },
      ],
    })),
  },
});

const feld = (i: SucheInteraction, id: string) =>
  i.data?.components?.flatMap((r) => r.components ?? []).find((c) => c.custom_id === id)?.value?.trim() ?? "";

async function zustandNeu(token: string, e: Einstellungen, bis: number): Promise<Zustand> {
  const k: Kontingent = await kontingent(token);
  return { ...e, bis, frei: k.frei, naechste: k.naechste };
}

// ------------------------------------------------------------------ Einstieg

export async function handleSuche(i: SucheInteraction, token: string | undefined): Promise<NextResponse> {
  const user = i.member?.user;
  const id = i.data?.custom_id ?? "";
  if (!token || !user) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");

  // Karten im Thread: Zur Abstimmung / Verwerfen
  if (id === "ls:ok" || id === "ls:no") return karteKlick(i, token, id === "ls:ok");

  // Alles andere nur für die drei aus dem Team.
  if (!SHOW_NAMES[user.id]) return ephemeral("Die Lead-Suche ist nur für das Team.");

  // ---- Suche starten: Code schicken (oder direkt öffnen, wenn schon freigeschaltet)
  if (id === "ls:start") {
    const bis = await sitzungBis(token, user.id);
    if (bis) {
      const z = await zustandNeu(token, { ...STANDARD }, bis);
      const r = zentrale(z, "Willkommen zurück, du bist noch freigeschaltet.");
      return NextResponse.json({ type: 4, data: { flags: 64, embeds: r.embeds, components: r.components, allowed_mentions: { parse: [] } } });
    }
    const c = await erzeugeCode(token, user.id);
    if (!c) return ephemeral("Der Code konnte nicht erstellt werden. Bitte gleich nochmal versuchen.");
    return NextResponse.json({
      type: 4,
      data: {
        flags: 64,
        content:
          `🔑 **Dein Code:** \`${c.code}\`\nEr gilt **einmal** und ${Math.round((c.bis - Date.now()) / 60000)} Minuten (bis ${zeit(c.bis, "t")}). ` +
          `Drück auf **Code eingeben**, dann bist du ${SITZUNG_MIN} Minuten freigeschaltet.`,
        components: [{ type: 1, components: [{ type: 2, style: 1, label: "Code eingeben", custom_id: "ls:code" }] }],
        allowed_mentions: { parse: [] },
      },
    });
  }

  if (id === "ls:code") return NextResponse.json(modal("ls:codemodal", "Code eingeben", [{ id: "code", label: "Dein Code", placeholder: "XXXX-XXXX", required: true, max: 12 }]));

  if (id === "ls:codemodal") {
    const eingabe = feld(i, "code");
    if (!(await loeseCodeEin(token, user.id, eingabe))) {
      return update([], [{ type: 1, components: [{ type: 2, style: 1, label: "Code eingeben", custom_id: "ls:code" }] }], "❌ Der Code stimmt nicht oder ist abgelaufen. Drück „Code eingeben“ und versuch es noch einmal, oder starte unten im Kanal einen neuen.");
    }
    const bis = await starteSitzung(token, user.id);
    if (!bis) return ephemeral("Die Freischaltung hat nicht geklappt. Bitte nochmal versuchen.");
    const z = await zustandNeu(token, { ...STANDARD }, bis);
    const r = zentrale(z, "✅ Freigeschaltet.");
    return update(r.embeds, r.components);
  }

  // ---- ab hier: Suchzentrale (Zustand aus der Nachricht)
  const z = lesZustand(i.message?.embeds?.[0]);
  if (!z) return ephemeral("Diese Suchzentrale ist nicht mehr aktuell. Drück im Kanal noch einmal „Suche starten“.");
  if (z.bis <= Date.now()) {
    return update([], [], "⏱️ Deine Freischaltung ist abgelaufen. Drück im Kanal „Suche starten“ und gib den neuen Code ein.");
  }

  if (id === "ls:branche") {
    z.branchen = i.data?.values ?? [];
  } else if (id === "ls:radius") {
    z.radius = Number(i.data?.values?.[0] ?? z.radius);
  } else if (id === "ls:web") {
    z.web = (i.data?.values ?? []) as WebFilter[];
  } else if (id === "ls:sort") {
    z.sort = (i.data?.values?.[0] as Sortierung) ?? z.sort;
  } else if (id === "ls:ung") {
    z.ungesehene = !z.ungesehene;
  } else if (id === "ls:ort") {
    return NextResponse.json(
      modal("ls:ortmodal", "Ort & Filter", [
        { id: "ort", label: "Ort", value: z.ort, required: true, max: 80 },
        { id: "eigene", label: "Eigene Branchen (mit Komma trennen)", value: z.eigene.join(", "), placeholder: "z. B. Tattoo, Fahrschule", max: 100 },
        { id: "minb", label: "Mindestbewertung (0 bis 5, z. B. 4.0)", value: z.minBewertung ? String(z.minBewertung) : "", placeholder: "0 = egal", max: 4 },
        { id: "mina", label: "Mindestanzahl Bewertungen", value: String(z.minAnzahl), max: 4 },
      ]),
    );
  } else if (id === "ls:ortmodal") {
    z.ort = feld(i, "ort") || z.ort;
    z.eigene = feld(i, "eigene")
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_BRANCHEN);
    const mb = Number(feld(i, "minb").replace(",", "."));
    z.minBewertung = Number.isFinite(mb) ? Math.min(5, Math.max(0, mb)) : 0;
    const ma = parseInt(feld(i, "mina"), 10);
    z.minAnzahl = Number.isFinite(ma) ? Math.min(1000, Math.max(0, ma)) : z.minAnzahl;
  } else if (id === "ls:go") {
    return starteSuche(i, token, user.id, z);
  } else {
    return NextResponse.json({ ok: true });
  }

  const r = zentrale(z);
  return update(r.embeds, r.components);
}

// -------------------------------------------------------------------- Suche

async function starteSuche(i: SucheInteraction, token: string, userId: string, z: Zustand): Promise<NextResponse> {
  const insgesamt = z.branchen.length + z.eigene.length;
  if (insgesamt === 0) {
    const r = zentrale(z, "⚠️ Bitte erst mindestens eine Branche wählen.");
    return update(r.embeds, r.components);
  }
  if (insgesamt > MAX_BRANCHEN) {
    const r = zentrale(z, `⚠️ Bitte höchstens ${MAX_BRANCHEN} Branchen auf einmal (du hast ${insgesamt}). Jede Branche ist eine eigene Google-Anfrage.`);
    return update(r.embeds, r.components);
  }
  if (!z.web.length) {
    const r = zentrale(z, "⚠️ Bitte mindestens eine Website-Art wählen.");
    return update(r.embeds, r.components);
  }
  const k = await kontingent(token);
  if (k.frei <= 0) {
    const frisch = { ...z, frei: 0, naechste: k.naechste };
    const r = zentrale(frisch, `⏳ Das Team hat die ${MAX_SUCHEN} Suchen der letzten 24 Stunden verbraucht. ${k.naechste ? `Die nächste ist wieder frei ${zeit(k.naechste)}.` : ""}`);
    return update(r.embeds, r.components);
  }

  const appId = i.application_id;
  const itoken = i.token;
  if (!appId || !itoken) return ephemeral("Discord hat keine Antwortadresse mitgeschickt.");

  after(async () => {
    try {
      await fuehreSucheAus(token, appId, itoken, userId, z);
    } catch (err) {
      console.error("[lead-suche] Suche fehlgeschlagen:", err);
      const r = zentrale(z, "⚠️ Die Suche hat nicht geklappt. Es wurde keine Suche verbraucht. Bitte nochmal versuchen.");
      await editInteractionOriginal(appId, itoken, { embeds: r.embeds, components: r.components });
    }
  });
  return update(
    [{ title: "🔎 Suche läuft …", description: `${z.branchen.length + z.eigene.length} Branche(n) in **${z.ort}** (${z.radius} km). Das dauert bis zu einer Minute.`, color: 0xd4a23c }],
    [],
  );
}

async function fuehreSucheAus(token: string, appId: string, itoken: string, userId: string, z: Zustand): Promise<void> {
  const name = SHOW_NAMES[userId] ?? "Team";
  const buchung = await verbrauchSuche(token, userId);
  const zeigeZentrale = async (hinweis: string, k?: Kontingent) => {
    const kk = k ?? (await kontingent(token));
    const r = zentrale({ ...z, frei: kk.frei, naechste: kk.naechste }, hinweis);
    await editInteractionOriginal(appId, itoken, { embeds: r.embeds, components: r.components });
  };

  const res = await sucheFirmen(token, z);
  if (!res.ok) {
    if (buchung) await gibSucheZurueck(token, buchung);
    await zeigeZentrale(`⚠️ ${res.fehler} Es wurde keine Suche verbraucht.`);
    return;
  }
  if (!res.treffer.length) {
    // Google wurde trotzdem gefragt, deshalb zählt die Suche. Das steht auch so da.
    await zeigeZentrale(
      `Keine passenden Firmen gefunden (geprüft wurden alle Treffer im Umkreis). Versuch einen größeren Umkreis, andere Branchen oder schalte „Nur ungesehene“ aus. Die Suche zählt trotzdem.`,
    );
    return;
  }

  const kanal = await sucheKanal(token);
  if (!kanal) {
    if (buchung) await gibSucheZurueck(token, buchung);
    await zeigeZentrale("⚠️ Der Kanal #lead-suche fehlt und konnte nicht angelegt werden. Es wurde keine Suche verbraucht.");
    return;
  }

  // Privater Thread, nur für den Suchenden.
  const stamp = new Date().toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const thread = await call<{ id: string }>(token, "POST", `/channels/${kanal}/threads`, {
    name: `${name} · ${stamp}`.slice(0, 100),
    type: 12,
    auto_archive_duration: 1440,
    invitable: true,
  });
  if (!thread) {
    if (buchung) await gibSucheZurueck(token, buchung);
    await zeigeZentrale(
      `⚠️ Der Bot darf keinen privaten Thread anlegen (${letzterFehler.slice(0, 120)}). Dem Bot fehlen in Discord die Rechte „Private Threads erstellen“ und „In Threads schreiben“. Es wurde keine Suche verbraucht.`,
    );
    return;
  }
  const dabei = await call(token, "PUT", `/channels/${thread.id}/thread-members/${userId}`);
  if (!dabei) console.error(`[lead-suche] Thread-Mitglied hinzufügen fehlgeschlagen: ${letzterFehler}`);

  await call(token, "POST", `/channels/${thread.id}/messages`, {
    content:
      `<@${userId}> **${res.treffer.length} Treffer** in ${z.ort} (${z.radius} km). ` +
      `Mit **Zur Abstimmung** kommt die Firma als Karte nach #leads, mit **Verwerfen** ist sie weg und taucht (bei „Nur ungesehene“) nicht wieder auf. ` +
      `Dieser Thread schließt sich nach einem Tag von selbst.`,
    allowed_mentions: { users: [userId] },
  });

  for (const t of res.treffer) {
    const a = analyseFuer(t);
    const basis = kartenEmbed(a, t.url, t.domain, name);
    const felder = (basis.fields ?? []).filter((f) => !f.name.startsWith(F_YES) && !f.name.startsWith(F_NO));
    const embed: EmbedLike = {
      ...basis,
      color: 0x3b82f6,
      fields: [...felder, ...zusatzFelder(t)],
      footer: { text: `lead:${t.domain}${SEP}suche:${userId}${SEP}${FOOTER_HINWEIS}` },
    };
    await call(token, "POST", `/channels/${thread.id}/messages`, {
      embeds: [embed],
      components: [
        {
          type: 1,
          components: [
            { type: 2, style: 3, label: "Zur Abstimmung", custom_id: "ls:ok" },
            { type: 2, style: 4, label: "Verwerfen", custom_id: "ls:no" },
          ],
        },
      ],
      allowed_mentions: { parse: [] },
    });
  }
  await merkeGesehen(token, res.treffer.map((t) => t.seenKey));

  const k = await kontingent(token);
  await call(token, "POST", `/channels/${kanal}/messages`, {
    content: `🔎 **${name}** hat gesucht: ${res.treffer.length} Treffer in ${z.ort} (${z.radius} km). Noch **${k.frei} von ${MAX_SUCHEN}** Suchen frei${k.naechste ? `, die nächste wieder frei ${zeit(k.naechste)}` : ""}.`,
    allowed_mentions: { parse: [] },
  });
  await zeigeZentrale(`✅ **${res.treffer.length} Treffer** liegen in deinem privaten Thread: <#${thread.id}>`, k);
}

// ------------------------------------------------------- Karten im Thread

async function karteKlick(i: SucheInteraction, token: string, abstimmen: boolean): Promise<NextResponse> {
  const user = i.member?.user;
  const embed = i.message?.embeds?.[0];
  if (!user || !embed) return ephemeral("Diese Karte ist nicht mehr aktuell.");
  const teile = (embed.footer?.text ?? "").split(SEP);
  const domain = teile[0]?.startsWith("lead:") ? teile[0].slice(5) : null;
  const von = teile.find((t) => t.startsWith("suche:"))?.slice(6);
  if (!domain || !von) return ephemeral("Diese Karte ist nicht mehr aktuell.");
  if (von !== user.id) return ephemeral("Das ist nicht deine Suche.");
  const name = SHOW_NAMES[user.id] ?? "Team";
  const erledigt = (text: string, farbe: number): EmbedLike => ({
    ...embed,
    color: farbe,
    fields: [...(embed.fields ?? []).filter((f) => f.name !== "Entscheidung"), { name: "Entscheidung", value: text, inline: false }],
  });

  if (!abstimmen) {
    return update([erledigt(`🗑️ Verworfen von ${name}`, 0x6b7280)], []);
  }

  if (await findeBestehend(token, domain)) {
    return update([erledigt("ℹ️ Diese Firma gibt es schon in den Leads.", 0x6b7280)], []);
  }
  const kanal = await kartenKanal(token);
  if (!kanal) return ephemeral("Den Kanal #leads konnte ich nicht anlegen. Bitte die Rechte des Bots prüfen.");

  const felder = (embed.fields ?? []).filter((f) => f.name !== "Entscheidung");
  felder.push(
    { name: `${F_YES} (0 von ${NEEDED})`, value: "–", inline: true },
    { name: `${F_NO} (0 von ${NEEDED})`, value: "–", inline: true },
  );
  const karte: EmbedLike = {
    ...embed,
    color: COLOR.vote,
    fields: felder,
    footer: { text: `lead:${domain}${SEP}angelegt von ${name}${SEP}${FOOTER_HINWEIS}` },
  };
  const rolle = await teamRolle(token);
  const mid = await postKarte(
    token,
    kanal,
    karte,
    leadComponents("vote"),
    rolle ? { content: `<@&${rolle}> Neuer Lead: **${(embed.title ?? "Firma").replace(/[*_~`|>@]/g, "")}** – jetzt abstimmen`, roleId: rolle } : undefined,
  );
  if (!mid) return ephemeral("Die Karte konnte nicht nach #leads gelegt werden. Bitte nochmal versuchen.");
  return update([erledigt(`✅ Zur Abstimmung nach #${"leads"} gelegt von ${name}`, 0x22c55e)], []);
}

