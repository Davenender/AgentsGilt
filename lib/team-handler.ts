import { after, NextResponse } from "next/server";
import { call } from "@/lib/leads";
import { bereichFuer } from "@/lib/akademie-daten";
import { austrittKnopf, befehlAus, DAVID_ID, findeMitglied, knopfAus, mitglied, nameVon, team, uebergabeNachrichten, ziele, type Mitglied } from "@/lib/team";
import { registerKanal, schreibeAufnahmetest, schreibeTeam, stelleSicher, zeichneTeamKarte } from "@/lib/team-daten";
import { setzeRolle, sichtbarkeitFuerAnwaerter } from "@/lib/team-rollen";
import { hatBestanden, zielStatus } from "@/lib/aufnahme-daten";
import { holeInhalt, leseAkademie, zeichne } from "@/lib/akademie-daten";
import { fuehreAustrittAus, sammleFaelle, uebergib } from "@/lib/team-austritt";

// Befehl /team (Plan 4), nur für David: aufnehmen, daten, pause, zurueck, austritt, aufnahmetest, liste.
// Jede Änderung ist eine neue Zeile in #team-register; alles andere (Zuständig, Rufgruppe, Statistik, Akademie, Zentrale)
// liest von dort. Die Antwort sieht nur David.

const API = "https://discord.com/api/v10";

export interface TeamInteraction {
  token?: string;
  application_id?: string;
  data?: { name?: string; options?: { name: string; type?: number; value?: unknown; options?: { name: string; value?: unknown }[] }[] };
  member?: { user?: { id: string } };
}

const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

async function antworte(appId: string, itoken: string, content: string) {
  await fetch(`${API}/webhooks/${appId}/${itoken}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.slice(0, 1900), allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
}

export function handleTeamBefehl(i: TeamInteraction, token: string) {
  const user = i.member?.user;
  const appId = i.application_id;
  const itoken = i.token;
  if (!user || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt.");
  if (user.id !== DAVID_ID) return ephemeral("Das Team verwaltet nur David.");
  const b = befehlAus(i.data);
  if (!b) return ephemeral("Unbekannter Befehl.");

  after(async () => {
    await stelleSicher(token);
    // Beim Austritt geht auch die Kennung aus #team-register (Nummer oder Name), falls die Person den Server schon verlassen hat.
    const m = b.aktion === "austritt" ? findeMitglied(b.person, b.kennung) : b.person ? mitglied(b.person) : null;
    const neu = (aenderung: Partial<Mitglied>): Mitglied => ({ ...(m as Mitglied), ...aenderung });

    if (b.aktion === "liste") {
      await zeichneTeamKarte(token);
      return void (await antworte(appId, itoken, "👥 Die Übersicht in #team-register ist neu gezeichnet."));
    }
    if (b.aktion === "aufnahmetest") {
      const an = b.zustand === "an";
      if (!(await schreibeAufnahmetest(token, an))) return void (await antworte(appId, itoken, "⚠️ Das Register war nicht erreichbar."));
      const sicht = an ? await sichtbarkeitFuerAnwaerter(token) : null;
      const [ak, inhalt] = await Promise.all([leseAkademie(token), holeInhalt()]);
      const geaendert: string[] = [];
      for (const x of [...team()]) {
        if (x.discord === DAVID_ID) continue;
        if (an && x.status === "team") {
          const p = ak?.personen.get(x.discord);
          const ok = p && inhalt ? await hatBestanden(token, x.discord, { p, inhalt }) : false;
          if (ok) continue;
          await schreibeTeam(token, { ...x, status: "anwaerter" });
          await setzeRolle(token, x.discord, "anwaerter");
          geaendert.push(`🎓 ${x.name} ist jetzt Anwärter`);
        } else if (!an && x.status === "anwaerter") {
          await schreibeTeam(token, { ...x, status: "team" });
          await setzeRolle(token, x.discord, "team");
          geaendert.push(`🟢 ${x.name} ist wieder im Team`);
        } else continue;
        const p = ak?.personen.get(x.discord);
        if (p && inhalt) await zeichne(token, x.discord, p, inhalt);
      }
      return void (await antworte(
        appId,
        itoken,
        [
          an ? "🎓 **Aufnahmetest ist an.** Wer noch nicht bestanden hat, ist Anwärter und sieht nur #willkommen, #allgemein und die Akademie. Wer besteht, kommt automatisch ins Team." : "**Aufnahmetest ist aus.** Neue Leute kommen direkt ins Team.",
          ...(sicht ? [`• Sichtbarkeit: ${sicht.frei} Kanäle für Anwärter freigegeben, ${sicht.gesperrt} gesperrt${sicht.fehler ? `, ⚠️ ${sicht.fehler} ging nicht` : ""}`] : []),
          ...(geaendert.length ? geaendert.map((g) => `• ${g}`) : ["• Niemand wurde umgestellt."]),
        ].join("\n"),
      ));
    }

    if (!b.person) return void (await antworte(appId, itoken, "Bitte eine Person auswählen."));

    if (b.aktion === "aufnehmen") {
      if (m && m.status !== "ausgetreten") return void (await antworte(appId, itoken, `${m.name} steht schon im Register (${m.status}). Ändern geht mit \`/team daten\`.`));
      if (!b.name) return void (await antworte(appId, itoken, "Bitte einen Namen angeben."));
      if (team().some((x) => x.name.toLowerCase() === b.name.toLowerCase() && x.discord !== b.person && x.status !== "ausgetreten")) {
        return void (await antworte(appId, itoken, `Den Namen ${b.name} gibt es schon im Team. Bitte einen anderen (zum Beispiel mit Nachnamen-Buchstaben).`));
      }
      const status = await zielStatus(token, b.person);
      const ok = await schreibeTeam(token, { discord: b.person, name: b.name, status, notion: "", figur: b.figur, seit: heute(), telefon: b.telefon });
      if (!ok) return void (await antworte(appId, itoken, "⚠️ Das Register war nicht erreichbar. Bitte nochmal versuchen."));
      if (status === "anwaerter") await sichtbarkeitFuerAnwaerter(token);
      const rolle = await setzeRolle(token, b.person, status);
      const akademie = await bereichFuer(token, b.person);
      return void (await antworte(
        appId,
        itoken,
        [
          status === "anwaerter" ? `🎓 **${b.name}** ist Anwärter: sieht nur #willkommen, #allgemein und die Akademie, bis der Aufnahmetest bestanden ist. Danach automatisch im Team.` : `✅ **${b.name}** ist im Team.`,
          `• Rolle ${status === "anwaerter" ? "Anwärter" : "Team"}: ${rolle ? "vergeben" : "⚠️ nicht vergeben (bitte von Hand)"}`,
          `• Akademie: ${akademie}`,
          `• Rufgruppe: ${b.telefon ? `klingelt ab jetzt mit (${b.telefon})` : "noch keine Nummer, mit `/team daten telefon:` nachtragen"}`,
          "",
          "**Noch von dir:**",
          "1. In Notion als **Gast** einladen. Danach die Notion-Kennung mit `/team daten notion:` eintragen (frag mich im Chat, ich suche sie dir heraus). Erst dann kann die Person zuständig sein.",
          "2. Die Push-App (ntfy) mit dem Team-Thema einrichten lassen.",
          "3. Die Vertraulichkeitsvereinbarung unterschreiben lassen.",
        ].join("\n"),
      ));
    }

    if (!m && b.aktion === "austritt")
      return void (await antworte(appId, itoken, "Wen meinst du? Wähle bei **person** jemanden aus oder trag bei **kennung** die Discord-Nummer oder den Namen aus #team-register ein."));
    if (!m) return void (await antworte(appId, itoken, "Diese Person steht nicht im Register. Neue Leute mit `/team aufnehmen`."));

    if (b.aktion === "daten") {
      const aenderung: Partial<Mitglied> = {};
      if (b.telefon) aenderung.telefon = b.telefon;
      if (b.figur) aenderung.figur = b.figur;
      if (b.notion) aenderung.notion = b.notion;
      if (b.name) aenderung.name = b.name;
      if (!Object.keys(aenderung).length) return void (await antworte(appId, itoken, "Nichts zu ändern: Gib Telefon, Figur, Name oder Notion an."));
      const ok = await schreibeTeam(token, neu(aenderung));
      return void (await antworte(appId, itoken, ok ? `✅ ${m.name}: ${Object.keys(aenderung).join(", ")} geändert.` : "⚠️ Das Register war nicht erreichbar."));
    }

    if (b.aktion === "pause") {
      if (m.discord === DAVID_ID) return void (await antworte(appId, itoken, "Du selbst kannst nicht pausieren."));
      if (m.status !== "team") return void (await antworte(appId, itoken, `${m.name} ist gerade nicht im Status Team (${m.status}).`));
      const ok = await schreibeTeam(token, neu({ status: "pause" }));
      return void (await antworte(
        appId,
        itoken,
        ok
          ? `⏸️ **${m.name}** ist in Pause: bleibt im Server und in der Akademie, klingelt nicht mehr in der Rufgruppe, ist nicht mehr als Zuständig wählbar und kann außerhalb der Akademie keine Knöpfe drücken. Die Push-App bekommt weiter das Team-Thema; wenn das nicht soll, bitte dort abbestellen lassen.`
          : "⚠️ Das Register war nicht erreichbar.",
      ));
    }

    if (b.aktion === "zurueck") {
      if (m.status !== "pause") return void (await antworte(appId, itoken, `${m.name} ist nicht in Pause (${m.status}).`));
      const status = await zielStatus(token, m.discord);
      const ok = await schreibeTeam(token, neu({ status }));
      if (ok) await setzeRolle(token, m.discord, status);
      return void (await antworte(appId, itoken, !ok ? "⚠️ Das Register war nicht erreichbar." : status === "team" ? `🟢 **${m.name}** ist zurück im Team.` : `🎓 **${m.name}** ist zurück, aber als Anwärter: Der Aufnahmetest ist an und noch nicht bestanden.`));
    }

    if (b.aktion === "austritt") {
      if (m.discord === DAVID_ID) return void (await antworte(appId, itoken, "Du selbst kannst nicht austreten."));
      if (m.status === "ausgetreten") return void (await antworte(appId, itoken, `${m.name} ist schon ausgetreten.`));
      const faelle = await sammleFaelle(token, m.discord);
      const kanal = await registerKanal(token);
      if (!faelle || !kanal) return void (await antworte(appId, itoken, "⚠️ Notion oder Discord war gerade nicht erreichbar. Bitte nochmal versuchen."));
      const poste = (body: Record<string, unknown>) => call(token, "POST", `/channels/${kanal}/messages`, { ...body, allowed_mentions: { parse: [] } });
      await poste({
        embeds: [
          {
            title: `🚪 Austritt von ${m.name} vorbereiten`,
            color: 0xef4444,
            description: [
              faelle.length ? `**${faelle.length} offene Fälle.** Wähle unten je Fall, wer übernimmt. Was du nicht auswählst, geht beim Ausführen an dich.` : "Keine offenen Kunden oder Lead-Karten.",
              "",
              "Danach **🚪 Austritt ausführen**: Rolle Team weg, Akademie-Kanäle ins ARCHIV (nicht gelöscht), vom Server entfernen. Alte erledigte Karten behalten ihren Verlauf.",
              "Offene Anfragen, Anrufe und Support-Tickets bitte kurz selbst ansehen, die laufen nur kurz.",
            ].join("\n"),
          },
        ],
      });
      for (const n of uebergabeNachrichten(m.discord, m.name, faelle, ziele(m.discord))) await poste(n);
      await poste({ content: `Wenn alles verteilt ist: Austritt von **${m.name}** ausführen.`, components: austrittKnopf(m.discord, false) });
      return void (await antworte(appId, itoken, `🚪 Die Übergabe für ${m.name} steht in #team-register (${faelle.length} offene Fälle).`));
    }

    await antworte(appId, itoken, "Unbekannter Befehl.");
  });
  return NextResponse.json({ type: 5, data: { flags: 64 } });
}

// ------------------------------------------------------------ Knöpfe und Auswahlen des Austritts (tm:…)

export interface TeamKnopfInteraction {
  token?: string;
  application_id?: string;
  data?: { custom_id?: string; values?: string[] };
  member?: { user?: { id: string } };
  message?: { id: string; content?: string; embeds?: { title?: string; description?: string; color?: number }[]; components?: { type: number; components: { custom_id?: string; placeholder?: string }[] }[] };
}

export function handleTeamKnopf(i: TeamKnopfInteraction, token: string) {
  const user = i.member?.user;
  const appId = i.application_id;
  const itoken = i.token;
  const k = knopfAus(i.data?.custom_id ?? "");
  if (!user || !appId || !itoken || !k) return ephemeral("Das hat gerade nicht geklappt.");
  if (user.id !== DAVID_ID) return ephemeral("Das macht nur David.");
  const msg = i.message;
  const name = nameVon(k.aus) ?? "die Person";

  if (k.aktion === "aus") return NextResponse.json({ type: 7, data: { content: `Wirklich? **${name}** verliert die Rolle Team und wird vom Server entfernt. Das lässt sich nur mit einer neuen Einladung rückgängig machen.`, components: austrittKnopf(k.aus, true) } });
  if (k.aktion === "ausnein") return NextResponse.json({ type: 7, data: { content: `Wenn alles verteilt ist: Austritt von **${name}** ausführen.`, components: austrittKnopf(k.aus, false) } });

  if (k.aktion === "ausja") {
    after(async () => {
      const bericht = await fuehreAustrittAus(token, k.aus);
      await fetch(`${API}/webhooks/${appId}/${itoken}/messages/@original`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
          embeds: [
            {
              title: `🚪 Austritt von ${name} ausgeführt`,
              color: 0x6b7280,
              description: [
                ...bericht,
                "",
                "**Noch von dir:**",
                "1. In Notion den Zugang entfernen.",
                "2. Push-Thema erneuern: Sag mir im Chat Bescheid, ich setze ein neues Thema, und das Team trägt es in der Push-App ein.",
                "3. Falls der Telefon-Luca-Prompt im Vapi-Dashboard Namen nennt, dort anpassen.",
              ].join("\n"),
            },
          ],
          components: [],
          allowed_mentions: { parse: [] },
        }),
        signal: AbortSignal.timeout(8000),
      }).catch(() => {});
    });
    return NextResponse.json({ type: 6 });
  }

  // tm:ue: einen Fall übergeben
  const neu = i.data?.values?.[0];
  if (!neu || !msg) return ephemeral("Bitte eine Person auswählen.");
  const zeile = msg.components?.find((r) => r.components.some((c) => c.custom_id === i.data?.custom_id));
  const titel = (zeile?.components[0]?.placeholder ?? "Fall").replace(/ → wer übernimmt\?$/, "");
  after(async () => {
    const ok = await uebergib(token, { art: k.art!, ref: k.ref! }, k.aus, neu);
    const embed = msg.embeds?.[0] ?? { title: "Übergabe", description: "" };
    const rest = ok ? (msg.components ?? []).filter((r) => r !== zeile) : (msg.components ?? []);
    await fetch(`${API}/webhooks/${appId}/${itoken}/messages/@original`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{ ...embed, description: `${embed.description ?? ""}\n${ok ? `✅ ${titel} → ${nameVon(neu) ?? "?"}` : `⚠️ ${titel}: Übergabe hat nicht geklappt, bitte nochmal wählen.`}`.slice(0, 4000) }],
        components: rest,
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => {});
  });
  return NextResponse.json({ type: 6 });
}
