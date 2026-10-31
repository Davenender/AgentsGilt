// Push-Nachricht aufs Handy über die App ntfy (ntfy.sh).
//
// Jeder im Team abonniert in der App denselben Sender (Topic). Der Name steht nur als
// Env-Var NTFY_TOPIC bei Vercel: Wer ihn kennt, kann mitlesen, deshalb lang und zufällig wählen
// und nur das Nötigste in den Text schreiben.
//
// Wie mail.ts degradiert das sauber: ohne NTFY_TOPIC passiert nichts, und ein Fehler hier
// darf nie den eigentlichen Ablauf stören.

const SERVER = process.env.NTFY_SERVER?.trim() || "https://ntfy.sh";

export async function pushe(titel: string, text: string, link?: string): Promise<{ gesetzt: boolean; laenge: number; status: number | null }> {
  const topic = process.env.NTFY_TOPIC?.trim();
  if (!topic) {
    console.warn(`[ntfy] NTFY_TOPIC fehlt, Push "${titel}" wird übersprungen`);
    return { gesetzt: false, laenge: 0, status: null };
  }
  try {
    // JSON statt Kopfzeilen: Umlaute und Emojis kommen so unverändert an.
    const res = await fetch(SERVER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        title: titel.slice(0, 120),
        message: text.slice(0, 300) || " ",
        priority: 4,
        ...(link ? { click: link } : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`[ntfy] Push fehlgeschlagen: HTTP ${res.status}`);
    else console.log(`[ntfy] Push "${titel}" gesendet (Sender mit ${topic.length} Zeichen)`);
    return { gesetzt: true, laenge: topic.length, status: res.status };
  } catch (err) {
    console.error("[ntfy] Push fehlgeschlagen:", err);
    return { gesetzt: true, laenge: topic.length, status: null };
  }
}
