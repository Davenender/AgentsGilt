// Finanzen A2 (16.11.2026): Hakt jemand an der Kundenkarte „Anzahlung“ ab, fragt eine Karte in #posteingang David
// nach dem Betrag (nur nötig bei Überweisung; Stripe-Zahlungen bucht lib/finanzen.ts von selbst).
//   fin:betrag                 → Fenster mit Betrag und Tag
//   fin:betragfenster:<karte>  → bucht in „Rechnungen“, Karte zeigt „✅ … eingetragen“
//   fin:stripe                 → Karte schließen („kam über Stripe“)
import { after, NextResponse } from "next/server";
import type { AnfInteraction } from "@/lib/anfrage-handlers";
import { aendereKarte, call, posteingangKanal, postKarte, setzeAntwort } from "@/lib/leads";
import type { EmbedLike } from "@/lib/discord-calls";
import { anzahlungKarte, betragText, leseAnzahlungKarte, leseBetrag, leseZahltag } from "@/lib/finanzen-regeln";
import { bucheUeberweisung } from "@/lib/finanzen";
import { DAVID_ID } from "@/lib/team";

const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const heute = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
const datumDe = (iso: string) => iso.split("-").reverse().join(".");

const KNOEPFE = [
  {
    type: 1,
    components: [
      { type: 2, style: 3, label: "💶 Betrag eintragen", custom_id: "fin:betrag" },
      { type: 2, style: 2, label: "Kam über Stripe", custom_id: "fin:stripe" },
    ],
  },
];

/** Karte in #posteingang, wenn „Anzahlung“ an der Kundenkarte abgehakt wurde. */
export async function meldeAnzahlung(token: string, k: { nr: string; name: string; kanalId: string | null; notionUrl: string | null }): Promise<void> {
  const kanal = await posteingangKanal(token);
  if (kanal) await postKarte(token, kanal, anzahlungKarte(k), KNOEPFE);
}

const mitErledigt = (e: EmbedLike, text: string): EmbedLike => ({ ...e, color: 0x6b7280, fields: [...(e.fields ?? []), { name: "Erledigt", value: text, inline: false }] });

export function handleFinanzen(i: AnfInteraction, token: string | undefined) {
  const user = i.member?.user;
  const id = (i.data?.custom_id ?? "").slice("fin:".length);
  if (!user || !token || !i.channel_id || !i.application_id || !i.token) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");
  if (user.id !== DAVID_ID) return ephemeral("Das geht hier nicht.");
  const kanal = i.channel_id;

  if (id === "betrag" && i.message) {
    const k = leseAnzahlungKarte(i.message.embeds?.[0]);
    if (!k || k.erledigt) return ephemeral("Diese Karte ist schon erledigt.");
    return NextResponse.json({
      type: 9,
      data: {
        custom_id: `fin:betragfenster:${i.message.id}`,
        title: `Überweisung ${k.nr}`.slice(0, 45),
        components: [
          { type: 1, components: [{ type: 4, custom_id: "betrag", label: "Betrag in Euro", style: 1, required: true, max_length: 20, placeholder: "1.500,00" }] },
          { type: 1, components: [{ type: 4, custom_id: "datum", label: "Tag der Überweisung (TT.MM.JJJJ, leer = heute)", style: 1, required: false, max_length: 10 }] },
        ],
      },
    });
  }

  if (id.startsWith("betragfenster:") && i.type === 5) {
    const kartenId = id.slice("betragfenster:".length);
    const wert = (n: string) => i.data?.components?.flatMap((r) => r.components ?? []).find((c) => c.custom_id === n)?.value?.trim() ?? "";
    const cent = leseBetrag(wert("betrag"));
    if (!cent) return ephemeral("Der Betrag passt nicht. Bitte so: 1.500,00");
    const datum = leseZahltag(wert("datum"), heute());
    if (!datum) return ephemeral("Das Datum passt nicht. Bitte so: 16.11.2026 (nicht in der Zukunft).");
    after(async () => {
      const antwort = (t: string) => setzeAntwort(i.application_id!, i.token!, t);
      const m = await call<{ embeds?: EmbedLike[] }>(token, "GET", `/channels/${kanal}/messages/${kartenId}`);
      const e = m?.embeds?.[0];
      const k = leseAnzahlungKarte(e);
      if (!e || !k) return void (await antwort("Die Karte ist nicht mehr da."));
      if (k.erledigt) return void (await antwort("Diese Überweisung ist schon eingetragen."));
      if (!(await bucheUeberweisung({ nr: k.nr, notionUrl: k.notionUrl, betragCent: cent, datum }))) {
        return void (await antwort("⚠️ Notion hat das gerade nicht angenommen. Bitte gleich nochmal versuchen."));
      }
      await aendereKarte(token, kanal, kartenId, mitErledigt(e, `✅ ${betragText(cent)} am ${datumDe(datum)} in „Rechnungen“ eingetragen.`), []);
      await antwort(`✅ ${betragText(cent)} eingetragen.`);
    });
    return NextResponse.json({ type: 5, data: { flags: 64 } });
  }

  if (id === "stripe" && i.message) {
    const e = i.message.embeds?.[0];
    if (!e || !leseAnzahlungKarte(e)) return ephemeral("Diese Karte ist nicht mehr aktuell.");
    return NextResponse.json({ type: 7, data: { embeds: [mitErledigt(e, "Kam über Stripe. Das trägt der Bot von selbst ein.")], components: [], allowed_mentions: { parse: [] } } });
  }

  return NextResponse.json({ ok: true });
}
