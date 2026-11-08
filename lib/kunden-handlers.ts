import Anthropic from "@anthropic-ai/sdk";
import { after, NextResponse } from "next/server";
import type { AnfInteraction } from "@/lib/anfrage-handlers";
import { messageLink, postText, setzeKanalName } from "@/lib/discord";
import type { EmbedLike } from "@/lib/discord-calls";
import {
  alsVerloren,
  alsWiederAufgenommen,
  ARCHIV_KATEGORIE,
  grundAusIndex,
  jetztText,
  kartenKnoepfe,
  statusAusKarte,
  VERLOREN,
  verlorenZeile,
  verlustBestaetigung,
  verlustMenue,
  wiederZeile,
} from "@/lib/kundenablauf";
import { ordneKanalEin } from "@/lib/kundenkanal";
import { demoAusKarte, demoBestaetigung, demoFeldText, demoOffen, demoPush, demoZeile, mitDemo } from "@/lib/demo";
import { pusheDavid } from "@/lib/ntfy";
import { aendereKarte, call, setzeAntwort } from "@/lib/leads";
import { auswahlWerte, entferneBlock, haengeAn, leseAngebotQuelle, leseBloecke, setzeFelder, setzeStatus, setzeZustaendig } from "@/lib/notion-api";
import {
  AUSWERTUNG_PROMPT,
  bloeckeAlsText,
  bogenBloecke,
  ergebnisBlock,
  ergebnisKarte,
  feldAenderungen,
  findeBogen,
  findeErgebnis,
  guthabenLeer,
  notizenText,
  pruefeAuswertung,
} from "@/lib/gespraech";
import { kanalNameMitPunkt } from "@/lib/notion-kunden";
import { ausKarte, auswahlMenue, CHEF_ID, darf, gleich, mitZustaendig, NUR_ZUSTAENDIGE, pruefeAuswahl, TEAM, zustaendigZeile } from "@/lib/zustaendige";

// Knöpfe an der Kundenkarte im Kundenkanal (knd:):
//   „👥 Zuständige“, „📝 Gesprächsbogen“, „🧠 Gespräch auswerten“, „⚪ Verloren“ (Grund wählen,
//   rot bestätigen) und im Archiv „↩️ Wieder aufnehmen“.
// Bedienen dürfen nur die Zuständigen und David.

const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const ersetze = (content: string, components: unknown[] = []) =>
  NextResponse.json({ type: 7, data: { content, components, allowed_mentions: { parse: [] } } });

/** Die Notion-Adresse steht in der Karte im Feld „Notion“ als Link. */
const notionAusKarte = (karte: EmbedLike) =>
  karte.fields?.find((f) => f.name === "Notion")?.value.match(/\((https:\/\/[^)\s]+)\)/)?.[1] ?? null;
/** „KND-003 · Relax Fit“ → „KND-003“ */
const nrAusKarte = (karte: EmbedLike) => karte.title?.match(/^(KND-\d+)/)?.[1] ?? null;

/** Die Knöpfe passend zu Status und Demo-Stand der Karte. */
const knoepfeFuer = (karte: EmbedLike, status = statusAusKarte(karte)) => kartenKnoepfe(status, demoAusKarte(karte)?.status ?? null);

async function holeKarte(token: string, channelId: string, messageId: string): Promise<EmbedLike | null> {
  const msg = await call<{ id: string; embeds?: EmbedLike[] }>(token, "GET", `/channels/${channelId}/messages/${messageId}`);
  return msg?.embeds?.[0] ?? null;
}

export function handleKundenKnopf(i: AnfInteraction, token: string | undefined) {
  const user = i.member?.user;
  const channelId = i.channel_id;
  const appId = i.application_id;
  const itoken = i.token;
  const id = (i.data?.custom_id ?? "").slice("knd:".length);
  if (!user || !token || !channelId || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");
  const antwort = (text: string) => setzeAntwort(appId, itoken, text);

  // Knöpfe direkt an der Karte: Karte und Rechte aus der Nachricht.
  const karte = i.message?.embeds?.[0];
  const messageId = i.message?.id;
  const anKarte = ["zust", "bogen", "auswerten", "demo", "verloren", "wieder"].includes(id);
  if (anKarte) {
    if (!karte || !messageId) return ephemeral("Diese Karte ist nicht mehr aktuell.");
    if (!darf(user.id, ausKarte(karte) ?? [])) return ephemeral(NUR_ZUSTAENDIGE);
  }

  // ---- 👥 Zuständige: Auswahl öffnen (nur für die Person sichtbar)
  if (id === "zust" && karte && messageId) {
    return NextResponse.json({
      type: 4,
      data: {
        flags: 64,
        content: "👥 **Wer soll zuständig sein?** Wähle alle aus, die zuständig sein sollen. Möglich sind David, Jakob und Mijo.",
        components: auswahlMenue(messageId, ausKarte(karte) ?? []),
        allowed_mentions: { parse: [] },
      },
    });
  }

  // ---- Zuständige gewählt
  if (id.startsWith("zustwahl:")) {
    const kartenId = id.slice("zustwahl:".length);
    const auswahl = pruefeAuswahl(i.data?.values);
    if (!auswahl.ok) return ephemeral(`${auswahl.grund} Bitte nochmal auf „👥 Zuständige“ klicken.`);
    after(async () => {
      const k = await holeKarte(token, channelId, kartenId);
      if (!k) return void (await antwort("Die Karte ist nicht mehr da."));
      const alt = ausKarte(k) ?? [];
      // Nochmal prüfen: Zwischen Öffnen und Abschicken kann sich etwas geändert haben.
      if (!darf(user.id, alt)) return void (await antwort(NUR_ZUSTAENDIGE));
      if (gleich(alt, auswahl.ids)) return void (await antwort("Es bleibt, wie es ist."));
      // Zuerst die Karte (sie gilt), dann Notion.
      if (!(await aendereKarte(token, channelId, kartenId, mitZustaendig(k, auswahl.ids), knoepfeFuer(k)))) {
        return void (await antwort("⚠️ Die Karte konnte ich gerade nicht ändern. Bitte nochmal versuchen."));
      }
      await postText(token, channelId, zustaendigZeile(alt, auswahl.ids, user.id));
      const seite = notionAusKarte(k);
      const ok = seite ? await setzeZustaendig(seite, auswahl.ids) : false;
      await antwort(
        ok
          ? "✅ Gespeichert. Karte und Notion sind angepasst."
          : "✅ Die Karte ist geändert. Notion konnte ich gerade nicht anpassen, der stündliche Abgleich holt das nach.",
      );
    });
    return ersetze("⏳ Wird gespeichert …");
  }

  // ---- 📝 Gesprächsbogen: Link zum Bogen (fehlt er, z. B. bei älteren Kunden, wird er angelegt)
  if (id === "bogen" && karte) {
    after(async () => {
      const seite = notionAusKarte(karte);
      const bloecke = seite ? await leseBloecke(seite) : null;
      if (!seite || !bloecke) return void (await antwort("⚠️ Die Notion-Seite konnte ich gerade nicht lesen. Bitte gleich nochmal versuchen."));
      let bogen = findeBogen(bloecke);
      let neu = false;
      if (!bogen) {
        bogen = (await haengeAn(seite, bogenBloecke()))?.[0] ?? null;
        neu = true;
      }
      if (!bogen) return void (await antwort("⚠️ Den Gesprächsbogen konnte ich nicht anlegen. Bitte gleich nochmal versuchen."));
      await antwort(`📝 ${neu ? "Der Gesprächsbogen ist jetzt auf der Notion-Seite angelegt. " : ""}[Gesprächsbogen öffnen](${seite.split("#")[0]}#${bogen.replace(/-/g, "")})\nNotizen unter „4. Notizen“, danach hier „🧠 Gespräch auswerten“ drücken.`);
    });
    return ephemeral("⏳ Ich hole den Gesprächsbogen …");
  }

  // ---- 🧠 Gespräch auswerten: Bogen und Notizen lesen, KI fasst zusammen, Notion wird ausgefüllt
  if (id === "auswerten" && karte) {
    if (statusAusKarte(karte) === VERLOREN) return ephemeral("Dieser Kunde ist als verloren markiert.");
    const von = TEAM.find((t) => t.discord === user.id)?.name ?? user.global_name ?? user.username ?? "Team";
    after(async () => {
      const seite = notionAusKarte(karte);
      const bloecke = seite ? await leseBloecke(seite) : null;
      if (!seite || !bloecke) return void (await antwort("⚠️ Die Notion-Seite konnte ich gerade nicht lesen. Bitte gleich nochmal versuchen."));
      if (!findeBogen(bloecke)) return void (await antwort("Diese Seite hat noch keinen Gesprächsbogen. Drück erst „📝 Gesprächsbogen“ und schreib die Notizen dort hinein."));
      if (!notizenText(bloecke)) return void (await antwort("Unter „4. Notizen“ im Gesprächsbogen steht noch nichts. Erst mitschreiben, dann auswerten."));
      const apiKey = process.env.ANTHROPIC_API_KEY;
      const [werte, aktuell] = await Promise.all([auswahlWerte(), leseAngebotQuelle(seite)]);
      if (!apiKey || !werte || !aktuell) return void (await antwort("Die Auswertung ist gerade nicht möglich. Bitte später nochmal versuchen."));

      const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
      let raw: unknown = null;
      try {
        const res = await new Anthropic({ apiKey, timeout: 35_000, maxRetries: 0 }).messages.create({
          model: "claude-haiku-5-5",
          max_tokens: 2000,
          output_config: { effort: "low" },
          system: AUSWERTUNG_PROMPT.replace("{ANGEBOTE}", werte.angebote.join(", ") || "keine")
            .replace("{QUELLEN}", werte.quellen.join(", ") || "keine")
            .replace("{HEUTE}", heute),
          messages: [{ role: "user", content: `<seite>\n${bloeckeAlsText(bloecke).slice(0, 40_000)}\n</seite>` }],
        });
        const out = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");
        const a = out.indexOf("{");
        const b = out.lastIndexOf("}");
        if (a !== -1 && b > a) raw = JSON.parse(out.slice(a, b + 1));
      } catch (err) {
        console.error("[kunde] Gespräch auswerten fehlgeschlagen:", err);
        const leer = guthabenLeer(String((err as { message?: string })?.message ?? err));
        return void (await antwort(leer ? "Die Auswertung ist gerade nicht möglich: Das KI-Guthaben ist leer. Bitte später nochmal versuchen." : "⚠️ Die Auswertung hat nicht geklappt. Bitte gleich nochmal versuchen."));
      }
      const auswertung = pruefeAuswertung(raw, werte, heute);
      if (!auswertung) return void (await antwort("⚠️ Die Auswertung hat nicht geklappt. Bitte gleich nochmal versuchen."));

      // Notion: Felder nach den Regeln, Ergebnis unter „5. Ergebnis“ (eine frühere Auswertung wird ersetzt).
      const felder = feldAenderungen(auswertung, aktuell);
      const felderOk = await setzeFelder(seite, felder.properties);
      const ergebnis = findeErgebnis(bloecke);
      for (const alt of ergebnis.alte) await entferneBlock(alt);
      const bogenOk = (await haengeAn(seite, [ergebnisBlock(auswertung, von, jetztText())], ergebnis.ueberschrift ?? undefined)) !== null;

      await call(token, "POST", `/channels/${channelId}/messages`, {
        content: `🧠 Gespräch ausgewertet von <@${user.id}>`,
        embeds: [ergebnisKarte(auswertung, karte.title ?? "Kunde", seite)],
        allowed_mentions: { parse: [] },
      });
      const geaendert = felderOk && felder.geaendert.length ? ` Geändert: ${felder.geaendert.join(", ")}.` : "";
      await antwort(
        felderOk && bogenOk
          ? `✅ Ausgewertet. Das Ergebnis steht im Bogen unter „5. Ergebnis“ und als Karte im Kanal.${geaendert}`
          : "⚠️ Ausgewertet, aber Notion hat nicht alles angenommen. Die Ergebnis-Karte steht im Kanal, bitte die Seite kurz prüfen.",
      );
    });
    return ephemeral("⏳ Ich werte das Gespräch aus …");
  }

  // ---- 🎨 Demo anfragen, Schritt 1: rote Bestätigung (nur für die Person sichtbar)
  if (id === "demo" && karte && messageId) {
    if (statusAusKarte(karte) === VERLOREN) return ephemeral("Dieser Kunde ist als verloren markiert.");
    if (demoOffen(demoAusKarte(karte)?.status)) return ephemeral("Für diesen Kunden ist schon eine Demo angefragt.");
    const b = demoBestaetigung(messageId);
    return NextResponse.json({ type: 4, data: { flags: 64, content: b.content, components: b.components, allowed_mentions: { parse: [] } } });
  }
  if (id === "demonein") return ersetze("Abgebrochen. Es ist keine Demo angefragt.");

  // ---- Schritt 2: bestätigt. Notion „Demo-Status“, Karte, Zeile im Kanal, Push nur an David.
  if (id.startsWith("demoja:")) {
    const kartenId = id.slice("demoja:".length);
    const von = TEAM.find((t) => t.discord === user.id)?.name ?? user.global_name ?? user.username ?? "Jemand";
    after(async () => {
      const k = await holeKarte(token, channelId, kartenId);
      if (!k) return void (await antwort("Die Karte ist nicht mehr da."));
      if (!darf(user.id, ausKarte(k) ?? [])) return void (await antwort(NUR_ZUSTAENDIGE));
      if (statusAusKarte(k) === VERLOREN) return void (await antwort("Dieser Kunde ist als verloren markiert."));
      if (demoOffen(demoAusKarte(k)?.status)) return void (await antwort("Für diesen Kunden ist schon eine Demo angefragt."));
      const seite = notionAusKarte(k);
      // Drückt David selbst, startet es sofort (bestätigt), sonst wartet die Anfrage auf ihn.
      const vonDavid = user.id === CHEF_ID;
      const status = vonDavid ? "bestätigt" : "angefragt";
      if (!seite || !(await setzeFelder(seite, { "Demo-Status": { select: { name: status } }, "Demo-Link": { url: null } }))) {
        return void (await antwort("⚠️ Notion hat die Anfrage nicht angenommen. Es ist nichts angefragt, bitte gleich nochmal versuchen."));
      }
      const zeit = jetztText();
      const neu = mitDemo(k, demoFeldText(status, null, { von: user.id, zeit }));
      await aendereKarte(token, channelId, kartenId, neu, knoepfeFuer(neu));
      await postText(token, channelId, demoZeile(vonDavid ? "sofort" : "anfrage", { von: user.id, zeit }));
      if (!vonDavid) {
        const p = demoPush(k.title ?? "einen Kunden", von);
        await pusheDavid(p.titel, p.text, messageLink(channelId, kartenId));
      }
      await antwort(vonDavid ? "✅ Demo gestartet. Sie steht in der Zentrale bereit." : "✅ Demo angefragt. David bekommt eine Nachricht und bestätigt sie in der Zentrale.");
    });
    return ersetze("⏳ Wird angefragt …");
  }

  // ---- ⚪ Verloren, Schritt 1: Grund wählen
  if (id === "verloren" && karte && messageId) {
    if (statusAusKarte(karte) === VERLOREN) return ephemeral("Dieser Kunde ist schon als verloren markiert.");
    return NextResponse.json({
      type: 4,
      data: { flags: 64, content: "⚪ **Warum ist der Kunde verloren?** Bitte den Grund wählen.", components: verlustMenue(messageId), allowed_mentions: { parse: [] } },
    });
  }

  // ---- Schritt 2: roter Knopf
  if (id.startsWith("vgrund:")) {
    const kartenId = id.slice("vgrund:".length);
    const index = i.data?.values?.[0] ?? "";
    if (!grundAusIndex(index)) return ersetze("Bitte einen Grund aus der Liste wählen und nochmal auf „⚪ Verloren“ klicken.");
    const b = verlustBestaetigung(kartenId, index);
    return ersetze(b.content, b.components);
  }
  if (id === "vnein") return ersetze("Abgebrochen. Es bleibt alles, wie es ist.");

  // ---- Schritt 3: bestätigt
  if (id.startsWith("vja:")) {
    const [kartenId, index] = id.slice("vja:".length).split(":");
    const grund = grundAusIndex(index ?? "");
    if (!kartenId || !grund) return ersetze("Das hat nicht geklappt. Bitte nochmal auf „⚪ Verloren“ klicken.");
    after(async () => {
      const k = await holeKarte(token, channelId, kartenId);
      if (!k) return void (await antwort("Die Karte ist nicht mehr da."));
      if (!darf(user.id, ausKarte(k) ?? [])) return void (await antwort(NUR_ZUSTAENDIGE));
      if (statusAusKarte(k) === VERLOREN) return void (await antwort("Dieser Kunde ist schon als verloren markiert."));
      const seite = notionAusKarte(k);
      const nr = nrAusKarte(k);
      // Zuerst Notion: Klappt das nicht, bleibt alles, wie es ist.
      if (!seite || !nr || !(await setzeStatus(seite, VERLOREN, grund))) {
        return void (await antwort("⚠️ Notion hat die Änderung nicht angenommen. Es ist nichts geändert, bitte gleich nochmal versuchen."));
      }
      await aendereKarte(token, channelId, kartenId, alsVerloren(k, grund), kartenKnoepfe(VERLOREN));
      await setzeKanalName(token, channelId, kanalNameMitPunkt(nr, VERLOREN));
      const verschoben = await ordneKanalEin(token, channelId, VERLOREN);
      await postText(token, channelId, verlorenZeile(grund, user.id, jetztText()));
      await antwort(
        verschoben
          ? `✅ Als verloren markiert (Grund: ${grund}). Der Kanal liegt jetzt im ${ARCHIV_KATEGORIE}.`
          : `✅ Als verloren markiert (Grund: ${grund}). Den Kanal konnte ich noch nicht verschieben, das holt der stündliche Abgleich nach.`,
      );
    });
    return ersetze("⏳ Wird gespeichert …");
  }

  // ---- ↩️ Wieder aufnehmen
  if (id === "wieder" && karte && messageId) {
    if (statusAusKarte(karte) !== VERLOREN) return ephemeral("Dieser Kunde ist nicht als verloren markiert.");
    after(async () => {
      const seite = notionAusKarte(karte);
      const nr = nrAusKarte(karte);
      if (!seite || !nr || !(await setzeStatus(seite, "Lead", null))) {
        return void (await antwort("⚠️ Notion hat die Änderung nicht angenommen. Es ist nichts geändert, bitte gleich nochmal versuchen."));
      }
      await aendereKarte(token, channelId, messageId, alsWiederAufgenommen(karte), knoepfeFuer(karte, "Lead"));
      await setzeKanalName(token, channelId, kanalNameMitPunkt(nr, "Lead"));
      const verschoben = await ordneKanalEin(token, channelId, "Lead");
      await postText(token, channelId, wiederZeile(user.id, jetztText()));
      await antwort(
        verschoben
          ? "✅ Wieder aufgenommen. Status ist wieder Lead, der Kanal liegt wieder unter KUNDEN."
          : "✅ Wieder aufgenommen. Den Kanal konnte ich noch nicht zurückschieben, das holt der stündliche Abgleich nach.",
      );
    });
    return ephemeral("⏳ Wird wieder aufgenommen …");
  }

  return NextResponse.json({ ok: true });
}
