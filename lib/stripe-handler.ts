import { findChannelId, listMessages } from "@/lib/discord";
import { posteingangKanal, postKarte, teamRolle } from "@/lib/leads";
import { escapeHtml, getMailEnv, sendMail, shell } from "@/lib/mail";
import { listeKunden, setzeZahlungsstatus } from "@/lib/notion-api";
import { kanalName } from "@/lib/notion-kunden";
import type { Dienste } from "@/lib/stripe-meldung";

// Verbindet die Zahlungsmeldung (lib/stripe-meldung.ts) mit Notion, Discord und Mail.
export function stripeDienste(token: string): Dienste {
  return {
    kunden: listeKunden,
    setzeStatus: setzeZahlungsstatus,
    kundenKanal: (nr) => findChannelId(token, kanalName(nr)),
    posteingang: () => posteingangKanal(token),
    schonGemeldet: async (kanal, ereignis) =>
      (await listMessages(token, kanal, 30)).some((n) => n.embeds?.some((e) => e.footer?.text?.includes(ereignis))),
    poste: async (kanal, karte, hinweis) => {
      const rolle = hinweis ? await teamRolle(token) : null;
      const kurz = karte.title.replace(/[*_~`|>]/g, "");
      return Boolean(await postKarte(token, kanal, karte, [], rolle ? { content: `<@&${rolle}> ${kurz}`, roleId: rolle } : undefined));
    },
    schickeMail: async (betreff, text) => {
      const res = await sendMail({
        to: getMailEnv().to,
        subject: betreff,
        html: shell(betreff, text.split("\n").map((z) => `<p>${escapeHtml(z)}</p>`).join("")),
        text,
      });
      return !("skipped" in res) && !res.error;
    },
  };
}
