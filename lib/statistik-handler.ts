import { after, NextResponse } from "next/server";
import { sammleStatistik, zeigeStatistik } from "@/lib/statistik-daten";

// Knopf „🔄 Aktualisieren“ an der Statistik-Karte in #statistik (stat:). Darf jeder im Team drücken.

export function handleStatistikKnopf(i: { channel_id?: string; message?: { id: string } }, token: string | undefined) {
  const kanal = i.channel_id;
  const id = i.message?.id;
  if (!token || !kanal || !id) return NextResponse.json({ type: 4, data: { content: "Das hat gerade nicht geklappt.", flags: 64 } });
  after(async () => {
    const s = await sammleStatistik(token);
    if (s) await zeigeStatistik(token, s, { kanal, id });
  });
  return NextResponse.json({ type: 6 });
}
