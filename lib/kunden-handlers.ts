import { after, NextResponse } from "next/server";
import type { AnfInteraction } from "@/lib/anfrage-handlers";
import { postText, setzeKanalName } from "@/lib/discord";
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
import { aendereKarte, call, setzeAntwort } from "@/lib/leads";
import { setzeStatus, setzeZustaendig } from "@/lib/notion-api";
import { kanalNameMitPunkt } from "@/lib/notion-kunden";
import { ausKarte, auswahlMenue, darf, gleich, mitZustaendig, NUR_ZUSTAENDIGE, pruefeAuswahl, zustaendigZeile } from "@/lib/zustaendige";

// Knöpfe an der Kundenkarte im Kundenkanal (knd:):
//   „👥 Zuständige“, „⚪ Verloren“ (Grund wählen, rot bestätigen) und im Archiv „↩️ Wieder aufnehmen“.
// Bedienen dürfen nur die Zuständigen und David.

const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const ersetze = (content: string, components: unknown[] = []) =>
  NextResponse.json({ type: 7, data: { content, components, allowed_mentions: { parse: [] } } });

/** Die Notion-Adresse steht in der Karte im Feld „Notion“ als Link. */
const notionAusKarte = (karte: EmbedLike) =>
  karte.fields?.find((f) => f.name === "Notion")?.value.match(/\((https:\/\/[^)\s]+)\)/)?.[1] ?? null;
/** „KND-003 · Relax Fit“ → „KND-003“ */
const nrAusKarte = (karte: EmbedLike) => karte.title?.match(/^(KND-\d+)/)?.[1] ?? null;

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
  const anKarte = id === "zust" || id === "verloren" || id === "wieder";
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
      if (!(await aendereKarte(token, channelId, kartenId, mitZustaendig(k, auswahl.ids), kartenKnoepfe(statusAusKarte(k))))) {
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
      await aendereKarte(token, channelId, messageId, alsWiederAufgenommen(karte), kartenKnoepfe("Lead"));
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
