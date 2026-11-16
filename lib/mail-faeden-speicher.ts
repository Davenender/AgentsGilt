// Speicher der Mail-Fäden: privater Kanal „mail-faeden“ (nur David und der Bot), eine JSON-Zeile je Nachricht.
// Logik: lib/mail-faeden.ts.
import { nurDavidKanal } from "@/lib/akademie-daten";
import { alleNachrichten, call } from "@/lib/leads";
import { fadenZeile, leseFaeden, type Faden } from "@/lib/mail-faeden";

const KANAL = "mail-faeden";
const THEMA = "Merkzettel des Bots: wohin Antworten auf Mails des Teams gehören (30 Tage). Nicht löschen.";

export async function merkeFaden(token: string, f: Faden): Promise<boolean> {
  const kanal = await nurDavidKanal(token, KANAL, THEMA);
  if (!kanal) return false;
  return Boolean(await call(token, "POST", `/channels/${kanal}/messages`, { content: fadenZeile(f), allowed_mentions: { parse: [] } }));
}

export async function ladeFaeden(token: string): Promise<Faden[]> {
  const kanal = await nurDavidKanal(token, KANAL, THEMA);
  if (!kanal) return [];
  const nachrichten = await alleNachrichten(token, kanal, 300);
  return leseFaeden(nachrichten.map((n) => n.content ?? ""));
}
