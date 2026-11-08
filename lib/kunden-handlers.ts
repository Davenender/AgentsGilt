import { after, NextResponse } from "next/server";
import type { AnfInteraction } from "@/lib/anfrage-handlers";
import { postText } from "@/lib/discord";
import type { EmbedLike } from "@/lib/discord-calls";
import { KARTEN_KNOEPFE, ausKarte, auswahlMenue, darf, gleich, mitZustaendig, NUR_ZUSTAENDIGE, pruefeAuswahl, zustaendigZeile } from "@/lib/zustaendige";
import { aendereKarte, call, setzeAntwort } from "@/lib/leads";
import { setzeZustaendig } from "@/lib/notion-api";

// Knöpfe an der Kundenkarte im Kundenkanal (knd:). Bisher: „👥 Zuständige“.
// Bedienen dürfen nur die Zuständigen und David.

const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });

/** Die Notion-Adresse steht in der Karte im Feld „Notion“ als Link. */
const notionAusKarte = (karte: EmbedLike) =>
  karte.fields?.find((f) => f.name === "Notion")?.value.match(/\((https:\/\/[^)\s]+)\)/)?.[1] ?? null;

export function handleKundenKnopf(i: AnfInteraction, token: string | undefined) {
  const user = i.member?.user;
  const channelId = i.channel_id;
  const appId = i.application_id;
  const itoken = i.token;
  const id = (i.data?.custom_id ?? "").slice("knd:".length);
  if (!user || !token || !channelId || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");

  // ---- Knopf an der Karte: Auswahl öffnen (nur für die Person sichtbar)
  if (id === "zust") {
    const karte = i.message?.embeds?.[0];
    const messageId = i.message?.id;
    if (!karte || !messageId) return ephemeral("Diese Karte ist nicht mehr aktuell.");
    const aktuell = ausKarte(karte) ?? [];
    if (!darf(user.id, aktuell)) return ephemeral(NUR_ZUSTAENDIGE);
    return NextResponse.json({
      type: 4,
      data: {
        flags: 64,
        content: "👥 **Wer soll zuständig sein?** Wähle alle aus, die zuständig sein sollen. Möglich sind David, Jakob und Mijo.",
        components: auswahlMenue(messageId, aktuell),
        allowed_mentions: { parse: [] },
      },
    });
  }

  // ---- Auswahl abgeschickt
  if (id.startsWith("zustwahl:")) {
    const kartenId = id.slice("zustwahl:".length);
    const auswahl = pruefeAuswahl(i.data?.values);
    if (!auswahl.ok) return ephemeral(`${auswahl.grund} Bitte nochmal auf „👥 Zuständige“ klicken.`);
    after(async () => {
      const msg = await call<{ id: string; embeds?: EmbedLike[] }>(token, "GET", `/channels/${channelId}/messages/${kartenId}`);
      const karte = msg?.embeds?.[0];
      if (!karte) return void (await setzeAntwort(appId, itoken, "Die Karte ist nicht mehr da."));
      const alt = ausKarte(karte) ?? [];
      // Nochmal prüfen: Zwischen Öffnen und Abschicken kann sich etwas geändert haben.
      if (!darf(user.id, alt)) return void (await setzeAntwort(appId, itoken, NUR_ZUSTAENDIGE));
      if (gleich(alt, auswahl.ids)) return void (await setzeAntwort(appId, itoken, "Es bleibt, wie es ist."));
      // Zuerst die Karte (sie gilt), dann Notion.
      if (!(await aendereKarte(token, channelId, kartenId, mitZustaendig(karte, auswahl.ids), KARTEN_KNOEPFE))) {
        return void (await setzeAntwort(appId, itoken, "⚠️ Die Karte konnte ich gerade nicht ändern. Bitte nochmal versuchen."));
      }
      await postText(token, channelId, zustaendigZeile(alt, auswahl.ids, user.id));
      const seite = notionAusKarte(karte);
      const ok = seite ? await setzeZustaendig(seite, auswahl.ids) : false;
      await setzeAntwort(
        appId,
        itoken,
        ok
          ? "✅ Gespeichert. Karte und Notion sind angepasst."
          : "✅ Die Karte ist geändert. Notion konnte ich gerade nicht anpassen, der stündliche Abgleich holt das nach.",
      );
    });
    return NextResponse.json({ type: 7, data: { content: "⏳ Wird gespeichert …", components: [] } });
  }

  return NextResponse.json({ ok: true });
}
