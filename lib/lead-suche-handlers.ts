import { after, NextResponse } from "next/server";
import type { EmbedLike } from "@/lib/discord-calls";
import {
  analyseFuer,
  artText,
  erzeugeCode,
  geocode,
  gibSucheZurueck,
  karteUrl,
  kontingent,
  leseKarteUrl,
  loeseCodeEin,
  MAX_BRANCHEN,
  MAX_SUCHEN,
  merkeEntscheid,
  merkeGesehen,
  SPAETER_TAGE,
  wochenUebersicht,
  type Woche,
  SITZUNG_MIN,
  sitzungBis,
  starteSitzung,
  STANDARD,
  STANDARD_LAT,
  STANDARD_LON,
  sucheFirmen,
  verbrauchSuche,
  zusatzFelder,
  type Einstellungen,
  type Kontingent,
  type Sortierung,
  type Treffer,
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
  letzterFehler,
  NEEDED,
  postKarte,
  SEP,
  sucheKanal,
  teamRolle,
} from "@/lib/leads";
import { SHOW_NAMES } from "@/lib/support";

// Bedienung der Lead-Suche in Discord (Kanal #lead-suche). Alles läuft über Knöpfe, Auswahlfelder
// und kleine Fenster. Die Suchzentrale ist eine private Nachricht (nur für den, der geklickt hat).
// Ihr Zustand steckt, signiert und unsichtbar, in der Adresse des Kartenbilds.

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
  message?: { id: string; embeds?: (EmbedLike & { image?: { url?: string } })[]; components?: unknown[] };
}

const ephemeral = (content: string) =>
  NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });

const update = (embeds: EmbedLike[], components: unknown[], content = "") =>
  NextResponse.json({ type: 7, data: { content, embeds, components, allowed_mentions: { parse: [] } } });

const DEFERRED_EPHEMERAL = { type: 5, data: { flags: 64 } };
const DEFERRED_UPDATE = { type: 6 };

/** Ändert die Antwort auf die Interaktion nachträglich (mit Text, Karten und Knöpfen). */
async function bearbeiteOriginal(i: SucheInteraction, body: { content?: string; embeds?: unknown[]; components?: unknown[] }): Promise<void> {
  if (!i.application_id || !i.token) return;
  try {
    const res = await fetch(`https://discord.com/api/v10/webhooks/${i.application_id}/${i.token}/messages/@original`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "", embeds: [], components: [], ...body, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`[lead-suche] Antwort ändern fehlgeschlagen: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  } catch (err) {
    console.error("[lead-suche] Antwort ändern fehlgeschlagen:", err);
  }
}

const sek = (ms: number) => Math.floor(ms / 1000);
const zeit = (ms: number, stil: "R" | "t" | "f" = "R") => `<t:${sek(ms)}:${stil}>`;

// ------------------------------------------------------------------ Listen

const BRANCHEN: [string, string, string][] = [
  ["Friseur", "Friseur", "✂️"],
  ["Barbier", "Barbershop", "💈"],
  ["Kosmetikstudio", "Kosmetikstudio", "💄"],
  ["Nagelstudio", "Nagelstudio", "💅"],
  ["Massage", "Massagepraxis", "💆"],
  ["Physiotherapie", "Physiotherapie", "🏥"],
  ["Heilpraktiker", "Heilpraktiker", "🌿"],
  ["Fitnessstudio", "Fitnessstudio", "🏋️"],
  ["Yoga & Pilates", "Yogastudio", "🧘"],
  ["Restaurant", "Restaurant", "🍽️"],
  ["Café", "Café", "☕"],
  ["Bäckerei", "Bäckerei", "🥖"],
  ["Metzgerei", "Metzgerei", "🥩"],
  ["Blumenladen", "Blumenladen", "💐"],
  ["Handwerker", "Handwerker", "🛠️"],
  ["Maler", "Malerbetrieb", "🎨"],
  ["Elektriker", "Elektriker", "⚡"],
  ["Sanitär & Heizung", "Sanitär Heizung", "🚿"],
  ["Schreiner", "Schreinerei", "🪚"],
  ["Autowerkstatt", "Autowerkstatt", "🔧"],
  ["Autohaus", "Autohaus", "🚗"],
  ["Zahnarzt", "Zahnarzt", "🦷"],
  ["Tierarzt", "Tierarzt", "🐾"],
  ["Steuerberater", "Steuerberater", "📊"],
  ["Fahrschule", "Fahrschule", "🚦"],
];
const RADIEN = [1, 2, 3, 5, 10, 15, 20, 30, 40, 50];

const WEB: Record<WebFilter, { label: string; text: string; beschreibung: string; emoji: string }> = {
  keine: { label: "Ohne Website", text: "Ohne Website", beschreibung: "Bei Google Maps ist keine Website eingetragen", emoji: "🚫" },
  social: { label: "Nur Facebook & Co.", text: "Nur Facebook, Instagram oder Verzeichnis", beschreibung: "Als Website steht nur ein Netzwerk oder Verzeichnis", emoji: "📱" },
  schlecht: { label: "Schlechte Website", text: "Schlechte oder veraltete Website", beschreibung: "Veraltet oder unübersichtlich (wird ausgewertet)", emoji: "🕸️" },
  alle: { label: "Gute Website", text: "Gute Website (alle übrigen)", beschreibung: "Firmen mit einer unauffälligen Website", emoji: "✅" },
};
const SORT: Record<Sortierung, { label: string; beschreibung: string }> = {
  empfohlen: { label: "Empfohlen", beschreibung: "Ohne Website und viele Bewertungen zuerst" },
  meiste: { label: "Meiste Bewertungen", beschreibung: "Bekannte Firmen zuerst" },
  beste: { label: "Beste Bewertung", beschreibung: "Höchste Sternebewertung zuerst" },
  naechste: { label: "Nächste zuerst", beschreibung: "Geringste Entfernung zuerst" },
};

const ART_FARBE: Record<string, number> = { keine: 0xef4444, social: 0xf97316, schlecht: 0xeab308, site: 0x3b82f6 };
const FARBE_NEU = 0x3b82f6;

// ----------------------------------------------------------- Zustand im Bild

interface Zustand extends Einstellungen {
  lat: number;
  lon: number;
  bis: number; // Freischaltung endet
  frei: number;
  naechste: number | null;
}

function kartenDaten(z: Zustand) {
  return {
    lat: z.lat,
    lon: z.lon,
    r: z.radius,
    o: z.ort,
    b: z.branchen,
    x: z.eigene,
    w: z.web,
    s: z.sort,
    u: z.ungesehene ? 1 : 0,
    mr: z.minBewertung,
    mc: z.minAnzahl,
    t: z.bis,
    f: z.frei,
    n: z.naechste,
  };
}

function lesZustand(embed: (EmbedLike & { image?: { url?: string } }) | undefined): Zustand | null {
  const j = leseKarteUrl(embed?.image?.url);
  if (!j) return null;
  return {
    lat: Number(j.lat ?? STANDARD_LAT),
    lon: Number(j.lon ?? STANDARD_LON),
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
}

const neuerZustand = (k: Kontingent, bis: number): Zustand => ({
  ...STANDARD,
  lat: STANDARD_LAT,
  lon: STANDARD_LON,
  bis,
  frei: k.frei,
  naechste: k.naechste,
});

// -------------------------------------------------------------- Darstellung

const sterneText = (min: number) => (min > 0 ? `ab ${String(min).replace(".", ",")} ★` : "egal");

function zentrale(z: Zustand, hinweis = ""): { embeds: EmbedLike[]; components: unknown[] } {
  const namen = [...z.branchen.map((b) => BRANCHEN.find(([, v]) => v === b)?.[0] ?? b), ...z.eigene];
  const kopf =
    `⏱️ Freigeschaltet bis ${zeit(z.bis, "t")} · endet ${zeit(z.bis)}\n` +
    `🎟️ **${z.frei} von ${MAX_SUCHEN}** Suchen frei` +
    (z.naechste ? ` · nächste wieder frei ${zeit(z.naechste)}` : "");
  const embed = {
    title: "🔎 Lead-Suche",
    description: `${hinweis ? `${hinweis}\n\n` : ""}${kopf}`,
    color: 0xd4a23c,
    fields: [
      { name: "📍 Ort", value: `${z.ort}\nUmkreis **${z.radius} km**`, inline: true },
      { name: "🏷️ Branchen", value: namen.length ? namen.map((n) => `• ${n}`).join("\n") : "*noch keine gewählt*", inline: true },
      { name: "🌐 Websites", value: z.web.length ? z.web.map((w) => `${WEB[w].emoji} ${WEB[w].text}`).join("\n") : "–", inline: true },
      { name: "↕️ Sortierung", value: SORT[z.sort].label, inline: true },
      { name: "⭐ Bewertung", value: `${sterneText(z.minBewertung)} · mind. ${z.minAnzahl} Bewertungen`, inline: true },
      { name: "👁️ Firmen", value: z.ungesehene ? "nur noch nicht gesehene" : "alle (auch schon gesehene)", inline: true },
    ],
    image: { url: karteUrl(kartenDaten(z)) },
    footer: { text: "Bis zu 5 Treffer · sie kommen in einen privaten Thread, den nur du siehst" },
  } as EmbedLike;
  const rows = [
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: "ls:branche",
          placeholder: `🏷️ Branchen wählen (höchstens ${MAX_BRANCHEN} insgesamt)`,
          min_values: 0,
          max_values: BRANCHEN.length,
          options: BRANCHEN.map(([label, wert, emoji]) => ({ label, value: wert, emoji: { name: emoji }, default: z.branchen.includes(wert) })),
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: "ls:radius",
          placeholder: "📏 Umkreis",
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
          placeholder: "🌐 Welche Websites?",
          min_values: 1,
          max_values: 4,
          options: (Object.keys(WEB) as WebFilter[]).map((w) => ({
            label: WEB[w].label,
            value: w,
            description: WEB[w].beschreibung,
            emoji: { name: WEB[w].emoji },
            default: z.web.includes(w),
          })),
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: "ls:sort",
          placeholder: "↕️ Sortierung",
          options: (Object.keys(SORT) as Sortierung[]).map((s) => ({ label: SORT[s].label, value: s, description: SORT[s].beschreibung, default: s === z.sort })),
        },
      ],
    },
    {
      type: 1,
      components: [
        { type: 2, style: 2, label: "Ort & Filter", emoji: { name: "📍" }, custom_id: "ls:ort" },
        { type: 2, style: z.ungesehene ? 1 : 2, label: z.ungesehene ? "Nur neue Firmen" : "Alle Firmen", emoji: { name: "👁️" }, custom_id: "ls:ung" },
        { type: 2, style: 2, label: "Woche", emoji: { name: "📊" }, custom_id: "ls:woche" },
        { type: 2, style: 3, label: "Suche starten", emoji: { name: "🔎" }, custom_id: "ls:go" },
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

async function zustandNeu(token: string, bis: number): Promise<Zustand> {
  return neuerZustand(await kontingent(token), bis);
}

const codeKnopf = [{ type: 1, components: [{ type: 2, style: 1, label: "Code eingeben", emoji: { name: "🔑" }, custom_id: "ls:code" }] }];

// ------------------------------------------------------------------ Einstieg

export async function handleSuche(i: SucheInteraction, token: string | undefined): Promise<NextResponse> {
  const user = i.member?.user;
  const id = i.data?.custom_id ?? "";
  if (!token || !user) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");

  // Karten im Thread
  if (["ls:ok", "ls:no", "ls:undo", "ls:later", "ls:note", "ls:notemodal"].includes(id)) return karteKlick(i, token, id);

  // Alles andere nur für die drei aus dem Team.
  if (!SHOW_NAMES[user.id]) return ephemeral("Die Lead-Suche ist nur für das Team.");

  // ---- Suche starten: Code schicken (oder direkt öffnen, wenn schon freigeschaltet).
  // Das dauert mehrere Zugriffe auf den Merkzettel, deshalb erst quittieren und dann antworten.
  if (id === "ls:start") {
    after(async () => {
      try {
        const bis = await sitzungBis(token, user.id);
        if (bis) {
          const r = zentrale(await zustandNeu(token, bis), "👋 Willkommen zurück, du bist noch freigeschaltet.");
          await bearbeiteOriginal(i, { embeds: r.embeds, components: r.components });
          return;
        }
        const c = await erzeugeCode(token, user.id);
        if (!c) {
          await bearbeiteOriginal(i, { content: "Der Code konnte nicht erstellt werden. Bitte gleich nochmal versuchen." });
          return;
        }
        const gilt = `Er gilt **einmal** und ${Math.round((c.bis - Date.now()) / 60000)} Minuten (bis ${zeit(c.bis, "t")}).`;
        // Den Code schickt der Bot als Direktnachricht. Sind Direktnachrichten aus, zeigen wir ihn ersatzweise privat im Kanal.
        const dm = await call<{ id: string }>(token, "POST", "/users/@me/channels", { recipient_id: user.id });
        const gesendet = dm
          ? await call(token, "POST", `/channels/${dm.id}/messages`, {
              content:
                `🔑 **Dein Code für die Lead-Suche:** \`${c.code}\`\n${gilt}\n` +
                `Geh zurück in ${i.channel_id ? `<#${i.channel_id}>` : "#lead-suche"} und drück dort auf **Code eingeben**. Danach bist du ${SITZUNG_MIN} Minuten freigeschaltet.`,
              allowed_mentions: { parse: [] },
            })
          : null;
        await bearbeiteOriginal(i, {
          content: gesendet
            ? `📬 Ich habe dir den Code per **Direktnachricht** geschickt. ${gilt}\nDrück auf **Code eingeben** und tipp ihn ein, dann bist du ${SITZUNG_MIN} Minuten freigeschaltet.`
            : `🔑 **Dein Code:** \`${c.code}\`\n⚠️ Ich konnte dir keine Direktnachricht schicken (in Discord unter Privatsphäre „Direktnachrichten von Servermitgliedern“ erlauben), deshalb steht er hier. ${gilt}\nDrück auf **Code eingeben**.`,
          components: codeKnopf,
        });
      } catch (err) {
        console.error("[lead-suche] Start fehlgeschlagen:", err);
        await bearbeiteOriginal(i, { content: "Das hat nicht geklappt. Bitte gleich nochmal versuchen." });
      }
    });
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  // Fenster und Feld bekommen jedes Mal einen neuen Namen, sonst füllt Discord den zuletzt getippten Text wieder ein.
  if (id === "ls:code") {
    const n = Date.now();
    return NextResponse.json(modal(`ls:codemodal:${n}`, "Code eingeben", [{ id: `code${n}`, label: "Dein Code (aus der Direktnachricht)", placeholder: "XXXX-XXXX", required: true, max: 12 }]));
  }

  if (id.startsWith("ls:codemodal")) {
    const eingabe = (i.data?.components?.[0]?.components?.[0]?.value ?? "").trim();
    after(async () => {
      try {
        if (!(await loeseCodeEin(token, user.id, eingabe))) {
          await bearbeiteOriginal(i, {
            content: "❌ Der Code stimmt nicht oder ist abgelaufen. Drück „Code eingeben“ und versuch es noch einmal, oder starte oben im Kanal einen neuen.",
            components: codeKnopf,
          });
          return;
        }
        const bis = await starteSitzung(token, user.id);
        if (!bis) {
          await bearbeiteOriginal(i, { content: "Die Freischaltung hat nicht geklappt. Bitte nochmal versuchen." });
          return;
        }
        const r = zentrale(await zustandNeu(token, bis), "✅ **Freigeschaltet.** Viel Erfolg bei der Suche!");
        await bearbeiteOriginal(i, { embeds: r.embeds, components: r.components });
      } catch (err) {
        console.error("[lead-suche] Code prüfen fehlgeschlagen:", err);
        await bearbeiteOriginal(i, { content: "Das hat nicht geklappt. Bitte gleich nochmal versuchen." });
      }
    });
    return NextResponse.json(DEFERRED_UPDATE);
  }

  // ---- ab hier: Suchzentrale (Zustand aus dem Kartenbild der Nachricht)
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
    const neuerOrt = feld(i, "ort") || z.ort;
    z.eigene = feld(i, "eigene")
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_BRANCHEN);
    const mb = Number(feld(i, "minb").replace(",", "."));
    z.minBewertung = Number.isFinite(mb) ? Math.min(5, Math.max(0, mb)) : 0;
    const ma = parseInt(feld(i, "mina"), 10);
    z.minAnzahl = Number.isFinite(ma) ? Math.min(1000, Math.max(0, ma)) : z.minAnzahl;
    // Den Ort schlägt der Server nach (dauert etwas): erst quittieren, dann antworten.
    after(async () => {
      let hinweis = "";
      if (neuerOrt !== z.ort) {
        const g = await geocode(neuerOrt);
        if (g) {
          z.ort = neuerOrt;
          z.lat = g.lat;
          z.lon = g.lon;
        } else {
          hinweis = `⚠️ Den Ort „${neuerOrt}“ habe ich nicht gefunden. Es bleibt bei ${z.ort}. Bitte genauer eingeben, z. B. „Offenbach am Main“.`;
        }
      }
      const r = zentrale(z, hinweis);
      await bearbeiteOriginal(i, { embeds: r.embeds, components: r.components });
    });
    return NextResponse.json(DEFERRED_UPDATE);
  } else if (id === "ls:woche") {
    after(async () => {
      try {
        await bearbeiteOriginal(i, { embeds: [wochenEmbed(await wochenUebersicht(token))] });
      } catch (err) {
        console.error("[lead-suche] Wochenübersicht fehlgeschlagen:", err);
        await bearbeiteOriginal(i, { content: "Die Wochenübersicht hat nicht geklappt. Bitte gleich nochmal versuchen." });
      }
    });
    return NextResponse.json(DEFERRED_EPHEMERAL);
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
    const r = zentrale({ ...z, frei: 0, naechste: k.naechste }, `⏳ Das Team hat die ${MAX_SUCHEN} Suchen der letzten 24 Stunden verbraucht. ${k.naechste ? `Die nächste ist wieder frei ${zeit(k.naechste)}.` : ""}`);
    return update(r.embeds, r.components);
  }

  if (!i.application_id || !i.token) return ephemeral("Discord hat keine Antwortadresse mitgeschickt.");

  after(async () => {
    try {
      await fuehreSucheAus(i, token, userId, z);
    } catch (err) {
      console.error("[lead-suche] Suche fehlgeschlagen:", err);
      const r = zentrale(z, "⚠️ Die Suche hat nicht geklappt. Bitte nochmal versuchen.");
      await bearbeiteOriginal(i, { embeds: r.embeds, components: r.components });
    }
  });
  return update(
    [
      {
        title: "🔎 Suche läuft …",
        description: `${insgesamt} Branche(n) in **${z.ort}** (${z.radius} km).\nGoogle Maps wird befragt, Websites werden angesehen. Das dauert bis zu einer Minute.`,
        color: 0xd4a23c,
        image: { url: karteUrl({ lat: z.lat, lon: z.lon, r: z.radius }) },
      } as EmbedLike,
    ],
    [],
  );
}

const sterne = (b: number | null, n: number) => (b !== null ? `⭐ ${b.toFixed(1).replace(".", ",")} (${n})` : `⭐ ${n} Bew.`);

function karteKnoepfe(maps: string | null) {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: "Zur Abstimmung", emoji: { name: "🗳️" }, custom_id: "ls:ok" },
        { type: 2, style: 1, label: "Später", emoji: { name: "⏳" }, custom_id: "ls:later" },
        { type: 2, style: 4, label: "Verwerfen", emoji: { name: "🗑️" }, custom_id: "ls:no" },
        { type: 2, style: 2, label: "Notiz", emoji: { name: "📝" }, custom_id: "ls:note" },
        ...(maps ? [{ type: 2, style: 5, label: "Karte", emoji: { name: "🗺️" }, url: maps }] : []),
      ],
    },
  ];
}

async function fuehreSucheAus(i: SucheInteraction, token: string, userId: string, z: Zustand): Promise<void> {
  const name = SHOW_NAMES[userId] ?? "Team";
  const buchung = await verbrauchSuche(token, userId);
  const zeigeZentrale = async (hinweis: string, k?: Kontingent) => {
    const kk = k ?? (await kontingent(token));
    const r = zentrale({ ...z, frei: kk.frei, naechste: kk.naechste }, hinweis);
    await bearbeiteOriginal(i, { embeds: r.embeds, components: r.components });
  };

  const res = await sucheFirmen(token, z);
  if (!res.ok) {
    if (buchung) await gibSucheZurueck(token, buchung);
    await zeigeZentrale(`⚠️ ${res.fehler}\nEs wurde keine Suche verbraucht.`);
    return;
  }
  if (!res.treffer.length) {
    // Google wurde trotzdem gefragt, deshalb zählt die Suche.
    await zeigeZentrale(
      "🤷 Keine passenden Firmen gefunden. Versuch einen größeren Umkreis, andere Branchen oder eine andere Website-Art, oder schalte „Nur neue Firmen“ aus.\nDie Suche zählt trotzdem.",
    );
    return;
  }

  const kanal = await sucheKanal(token);
  if (!kanal) {
    if (buchung) await gibSucheZurueck(token, buchung);
    await zeigeZentrale("⚠️ Der Kanal #lead-suche fehlt und konnte nicht angelegt werden.\nEs wurde keine Suche verbraucht.");
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
      `⚠️ Der Bot darf keinen privaten Thread anlegen (${letzterFehler.slice(0, 120)}). Dem Bot fehlen in Discord die Rechte „Private Threads erstellen“ und „In Threads schreiben“.\nEs wurde keine Suche verbraucht.`,
    );
    return;
  }
  const dabei = await call(token, "PUT", `/channels/${thread.id}/thread-members/${userId}`);
  if (!dabei) console.error(`[lead-suche] Thread-Mitglied hinzufügen fehlgeschlagen: ${letzterFehler}`);

  const begriffe = [...z.branchen.map((b) => BRANCHEN.find(([, v]) => v === b)?.[0] ?? b), ...z.eigene].join(", ");
  const liste = res.treffer
    .map((t, n) => `**${n + 1}** · ${t.platz.name}\n${sterne(t.platz.bewertung, t.platz.anzahl)} · 📏 ${t.platz.km} km · 🌐 ${artText(t.art)}`)
    .join("\n\n");
  await call(token, "POST", `/channels/${thread.id}/messages`, {
    content: `<@${userId}>`,
    embeds: [
      {
        title: `🔎 ${res.treffer.length} Treffer · ${begriffe}`,
        description: `📍 **${z.ort}** · Umkreis ${z.radius} km\n\n${liste}`,
        color: 0xd4a23c,
        image: { url: karteUrl({ lat: z.lat, lon: z.lon, r: z.radius, m: res.treffer.map((t) => [t.platz.lat, t.platz.lon]) }) },
        footer: { text: "Unten stehen die Karten. Dieser Thread schließt sich nach einem Tag von selbst." },
      },
    ],
    allowed_mentions: { users: [userId] },
  });

  for (const [n, t] of res.treffer.entries()) {
    const a = analyseFuer(t);
    const basis = kartenEmbed(a, t.url, t.domain, name);
    const felder = (basis.fields ?? []).filter((f) => !f.name.startsWith(F_YES) && !f.name.startsWith(F_NO) && f.value !== "nicht gefunden");
    const embed = {
      ...basis,
      author: { name: `Treffer ${n + 1} von ${res.treffer.length}` },
      color: ART_FARBE[t.art] ?? FARBE_NEU,
      fields: [...felder, ...zusatzFelder(t)],
      footer: { text: `lead:${t.domain}${SEP}suche:${userId}${SEP}${FOOTER_HINWEIS}` },
    } as EmbedLike;
    await call(token, "POST", `/channels/${thread.id}/messages`, {
      embeds: [embed],
      components: karteKnoepfe(t.platz.maps),
      allowed_mentions: { parse: [] },
    });
  }
  await merkeGesehen(token, res.treffer.map((t: Treffer) => t.seenKey));

  const k = await kontingent(token);
  await call(token, "POST", `/channels/${kanal}/messages`, {
    content: `🔎 **${name}** hat gesucht: ${res.treffer.length} Treffer in ${z.ort} (${z.radius} km). Noch **${k.frei} von ${MAX_SUCHEN}** Suchen frei${k.naechste ? `, die nächste wieder frei ${zeit(k.naechste)}` : ""}.`,
    allowed_mentions: { parse: [] },
  });
  await zeigeZentrale(`✅ **${res.treffer.length} Treffer** liegen in deinem privaten Thread: <#${thread.id}>`, k);
}

// ------------------------------------------------------- Karten im Thread

const entscheidung = (embed: EmbedLike) => embed.fields?.find((f) => f.name === "Entscheidung")?.value ?? "";

/** Macht aus einer verworfenen Karte wieder eine offene (Farbe, Knöpfe). */
export function stelleKarteHer(embed: EmbedLike): { embed: EmbedLike; components: unknown[] } {
  const fields = (embed.fields ?? []).filter((f) => f.name !== "Entscheidung");
  const web = fields.find((f) => f.name === "Website")?.value ?? "";
  const art = web.includes("keine Website") ? "keine" : web.includes("Verzeichnis") ? "social" : web.includes("schlechte") ? "schlecht" : "site";
  const maps = fields.find((f) => f.name === "Google Maps")?.value.match(/\((https?:[^)]+)\)/)?.[1] ?? null;
  return { embed: { ...embed, color: ART_FARBE[art] ?? FARBE_NEU, fields }, components: karteKnoepfe(maps) };
}

export const istVerworfen = (embed: EmbedLike) => /^(🗑️|⏳)/.test(entscheidung(embed));

async function karteKlick(i: SucheInteraction, token: string, aktion: string): Promise<NextResponse> {
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
  const undoKnopf = [{ type: 1, components: [{ type: 2, style: 2, label: "Zurücknehmen", emoji: { name: "↩️" }, custom_id: "ls:undo" }] }];

  if (aktion === "ls:undo") {
    if (!istVerworfen(embed)) return ephemeral("Nur verworfene oder zurückgestellte Karten lassen sich zurücknehmen.");
    const r = stelleKarteHer(embed);
    return update([r.embed], r.components);
  }

  // Notiz: kleines Fenster, die Notiz steht danach auf der Karte (und wandert mit nach #leads).
  if (aktion === "ls:note") {
    const alt = embed.fields?.find((f) => f.name === "📝 Notiz")?.value.replace(/\s+— \w+$/, "") ?? "";
    return NextResponse.json(
      modal("ls:notemodal", "Notiz zur Firma", [{ id: "notiz", label: "Deine Notiz (leer lassen = löschen)", value: alt, placeholder: "z. B. Inhaber ist Herr Schmidt, ab 14 Uhr anrufen", max: 300 }]),
    );
  }
  if (aktion === "ls:notemodal") {
    const text = feld(i, "notiz");
    const fields = (embed.fields ?? []).filter((f) => f.name !== "📝 Notiz");
    if (text) fields.push({ name: "📝 Notiz", value: `${text.replace(/[@<]/g, "")} — ${name}`, inline: false });
    return update([{ ...embed, fields }], i.message?.components ?? []);
  }

  if (aktion === "ls:no") {
    after(() => merkeEntscheid(token, domain, "no", user.id));
    return update([erledigt(`🗑️ Verworfen von ${name}`, 0x6b7280)], undoKnopf);
  }
  if (aktion === "ls:later") {
    after(() => merkeEntscheid(token, domain, "spaeter", user.id));
    const ab = new Date(Date.now() + SPAETER_TAGE * 86_400_000).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
    return update([erledigt(`⏳ Später von ${name}: wird ab ${ab} wieder vorgeschlagen`, 0x6366f1)], undoKnopf);
  }

  // ls:ok: als Abstimmungskarte nach #leads
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
  const karte = {
    ...embed,
    author: { name: "🔎 Aus der Lead-Suche" },
    color: COLOR.vote,
    fields: felder,
    footer: { text: `lead:${domain}${SEP}angelegt von ${name} per Suche${SEP}${FOOTER_HINWEIS}` },
  } as EmbedLike;
  const rolle = await teamRolle(token);
  const mid = await postKarte(
    token,
    kanal,
    karte,
    leadComponents("vote"),
    rolle ? { content: `<@&${rolle}> Neuer Lead aus der Suche: **${(embed.title ?? "Firma").replace(/[*_~`|>@]/g, "")}** – jetzt abstimmen`, roleId: rolle } : undefined,
  );
  if (!mid) return ephemeral("Die Karte konnte nicht nach #leads gelegt werden. Bitte nochmal versuchen.");
  after(() => merkeEntscheid(token, domain, "ok", user.id));
  return update([erledigt("✅ Zur Abstimmung nach #leads gelegt", 0x22c55e)], []);
}

// ------------------------------------------------------------ Wochenübersicht

const balken = (wert: number, max: number) => {
  const n = max > 0 ? Math.round((wert / max) * 12) : 0;
  return "█".repeat(n) + "░".repeat(12 - n);
};

function wochenEmbed(w: { diese: Woche; letzte: Woche }): EmbedLike {
  const block = (x: Woche) => {
    const max = Math.max(x.treffer, 1);
    const z = (name: string, v: number) => `${name.padEnd(15)} ${balken(v, max)} ${String(v).padStart(3)}`;
    const quote = x.treffer > 0 ? Math.round((x.leadAktiv / x.treffer) * 100) : 0;
    return (
      "```\n" +
      [z("Treffer gezeigt", x.treffer), z("Zur Abstimmung", x.zurAbstimmung), z("Später/verworfen", x.spaeter + x.verworfen), z("Angenommen", x.angenommen), z("Lead aktiv", x.leadAktiv)].join("\n") +
      "\n```" +
      `${x.suchen} ${x.suchen === 1 ? "Suche" : "Suchen"} · von ${x.treffer} Treffern wurden **${x.leadAktiv}** Lead${x.leadAktiv === 1 ? "" : "s"} (${quote} %)`
    );
  };
  const tag = (ms: number) => new Date(ms).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });
  return {
    title: "📊 Wochenübersicht Lead-Suche",
    color: 0xd4a23c,
    fields: [
      { name: `Diese Woche (ab ${tag(w.diese.von)})`, value: block(w.diese), inline: false },
      { name: `Letzte Woche (ab ${tag(w.letzte.von)})`, value: block(w.letzte), inline: false },
    ],
    footer: { text: "Gezählt wird ab dem Start der Lead-Suche." },
  };
}
