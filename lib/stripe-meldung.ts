import { createHmac, timingSafeEqual } from "node:crypto";

// Zahlungsmeldung von Stripe: Signatur prüfen und aus einem Ereignis eine Meldung machen. Rein, ohne Netz.
// Das Verschicken steht in lib/stripe-handler.ts, die Adresse in app/api/stripe/route.ts.

const TOLERANZ_S = 300;

/** Prüft die Stripe-Signatur nach dem dokumentierten Verfahren. Nur das Schema v1 zählt. */
export function signaturGueltig(roh: string, kopf: string | null, geheimnis: string, jetztMs = Date.now()): boolean {
  if (!kopf || !geheimnis) return false;
  const teile = kopf.split(",").map((t) => t.trim().split("="));
  const zeit = teile.find(([k]) => k === "t")?.[1];
  const signaturen = teile.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!zeit || !/^\d+$/.test(zeit) || !signaturen.length) return false;
  if (Math.abs(jetztMs / 1000 - Number(zeit)) > TOLERANZ_S) return false;
  const erwartet = Buffer.from(createHmac("sha256", geheimnis).update(`${zeit}.${roh}`).digest("hex"));
  return signaturen.some((s) => {
    const b = Buffer.from(s);
    return b.length === erwartet.length && timingSafeEqual(b, erwartet);
  });
}

/** „3“, „KND-003“ oder „knd_3“ aus den Metadaten des Zahlungslinks → „KND-003“. */
export function kundenNr(wert: unknown): string | null {
  const m = typeof wert === "string" ? wert.trim().match(/^(?:knd[-_ ]?)?(\d{1,6})$/i) : null;
  return m ? `KND-${m[1].padStart(3, "0")}` : null;
}

export type Meldung = {
  art: "bezahlt" | "fehlgeschlagen" | "abo_beendet";
  ereignis: string;
  betrag: number | null;
  waehrung: string;
  email: string | null;
  firma: string | null;
  kundeNr: string | null;
  /** Was in Notion unter „Zahlungsstatus“ stehen soll, null = nicht anfassen. */
  zahlungsstatus: "Bezahlt" | "Offen" | null;
  /** Das Team in Discord markieren. */
  hinweis: boolean;
  /** Zusätzlich eine Mail an kontakt@agentsgilt.com. */
  mail: boolean;
  letzterVersuch: boolean;
  link: string | null;
  beschreibung: string;
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const textOderNull = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const zahl = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const kleinOderNull = (v: unknown) => textOderNull(v)?.toLowerCase() ?? null;

const rechnungsLink = (o: Obj) => (o.id ? `https://dashboard.stripe.com/invoices/${String(o.id)}` : null);

function ausRechnung(id: string, typ: string, o: Obj): Meldung | null {
  // Neue Stripe-Versionen legen die Abo-Metadaten unter parent ab, ältere direkt an die Rechnung.
  const meta = obj(obj(obj(o.parent).subscription_details).metadata);
  const alt = obj(obj(o.subscription_details).metadata);
  const basis = {
    ereignis: id,
    waehrung: textOderNull(o.currency) ?? "eur",
    email: kleinOderNull(o.customer_email),
    firma: textOderNull(o.customer_name),
    kundeNr: kundenNr(meta.kunde ?? alt.kunde ?? obj(o.metadata).kunde),
    link: rechnungsLink(o),
  };
  if (typ === "invoice.paid") {
    const betrag = zahl(o.amount_paid) ?? 0;
    if (betrag <= 0) return null;
    const erste = o.billing_reason === "subscription_create";
    return { ...basis, art: "bezahlt", betrag, zahlungsstatus: "Bezahlt", hinweis: erste || o.billing_reason !== "subscription_cycle", mail: false, letzterVersuch: false, beschreibung: erste ? "Erste Zahlung, das Abo läuft." : o.billing_reason === "subscription_cycle" ? "Monatliche Abbuchung." : "Rechnung bezahlt." };
  }
  // Stripe versucht es bis zu 8-mal neu: Gemeldet wird nur der erste und der letzte Fehlschlag.
  const versuch = zahl(o.attempt_count) ?? 1;
  const letzter = o.next_payment_attempt === null || o.next_payment_attempt === undefined;
  if (versuch > 1 && !letzter) return null;
  return {
    ...basis,
    art: "fehlgeschlagen",
    betrag: zahl(o.amount_due),
    zahlungsstatus: "Offen",
    hinweis: true,
    mail: true,
    letzterVersuch: letzter,
    beschreibung: letzter
      ? "Letzter Versuch gescheitert. Stripe bucht nicht mehr ab, das Abo bleibt überfällig. Bitte beim Kunden melden."
      : "Stripe versucht es automatisch noch mehrmals und hat dem Kunden eine Mail geschickt.",
  };
}

/** Macht aus einem Stripe-Ereignis eine Meldung. null = nichts zu melden. */
export function meldungAus(ereignis: unknown): Meldung | null {
  const e = obj(ereignis);
  const id = textOderNull(e.id);
  const typ = textOderNull(e.type);
  if (!id || !typ || e.livemode !== true) return null;
  const o = obj(obj(e.data).object);

  if (typ === "invoice.paid" || typ === "invoice.payment_failed") return ausRechnung(id, typ, o);

  if (typ === "checkout.session.completed") {
    // Beim Abo meldet invoice.paid, sonst käme dieselbe Zahlung doppelt.
    if (o.mode !== "payment" || o.payment_status !== "paid") return null;
    const kunde = obj(o.customer_details);
    return {
      art: "bezahlt",
      ereignis: id,
      betrag: zahl(o.amount_total),
      waehrung: textOderNull(o.currency) ?? "eur",
      email: kleinOderNull(kunde.email),
      firma: textOderNull(kunde.business_name) ?? textOderNull(kunde.name),
      kundeNr: kundenNr(obj(o.metadata).kunde),
      zahlungsstatus: "Bezahlt",
      hinweis: true,
      mail: false,
      letzterVersuch: false,
      link: o.payment_intent ? `https://dashboard.stripe.com/payments/${String(o.payment_intent)}` : null,
      beschreibung: "Einmalzahlung.",
    };
  }

  if (typ === "customer.subscription.deleted") {
    return {
      art: "abo_beendet",
      ereignis: id,
      betrag: null,
      waehrung: "eur",
      email: null,
      firma: null,
      kundeNr: kundenNr(obj(o.metadata).kunde),
      zahlungsstatus: null,
      hinweis: true,
      mail: true,
      letzterVersuch: false,
      link: o.id ? `https://dashboard.stripe.com/subscriptions/${String(o.id)}` : null,
      beschreibung: "Das Abo wurde beendet, es wird nichts mehr abgebucht.",
    };
  }
  return null;
}

export function betragText(cent: number | null, waehrung: string): string {
  if (cent === null) return "unbekannt";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: waehrung.toUpperCase() }).format(cent / 100).replace(/ /g, " ");
}

const sauber = (s: string, n = 200) => (s.length > n ? `${s.slice(0, n - 1)}…` : s).replace(/@/g, "@​").replace(/<(#|@|:)/g, "<​$1");

const KOPF: Record<Meldung["art"], { zeichen: string; text: string; farbe: number }> = {
  bezahlt: { zeichen: "💶", text: "Zahlung eingegangen", farbe: 0x22c55e },
  fehlgeschlagen: { zeichen: "⚠️", text: "Zahlung fehlgeschlagen", farbe: 0xef4444 },
  abo_beendet: { zeichen: "🛑", text: "Abo beendet", farbe: 0xf97316 },
};

export type MeldungsKarte = { title: string; description: string; color: number; fields: { name: string; value: string; inline: boolean }[]; footer: { text: string } };

/** Die Karte für Discord. Name ist der Kunde aus Notion, null = noch nicht zugeordnet. */
export function meldungsKarte(m: Meldung, name: string | null): MeldungsKarte {
  const k = KOPF[m.art];
  const wer = sauber(name ?? m.firma ?? m.email ?? "Unbekannt", 120);
  const felder = [
    ...(m.firma && m.firma !== name ? [{ name: "Name bei Stripe", value: sauber(m.firma), inline: true }] : []),
    ...(m.email ? [{ name: "E-Mail", value: sauber(m.email), inline: true }] : []),
    ...(!name ? [{ name: "Kunde", value: "Nicht in Notion gefunden, bitte von Hand zuordnen.", inline: false }] : []),
    ...(m.link ? [{ name: "Stripe", value: `[Ansehen](${m.link})`, inline: true }] : []),
  ];
  return {
    title: `${k.zeichen} ${k.text}: ${wer}${m.betrag !== null ? ` · ${betragText(m.betrag, m.waehrung)}` : ""}`,
    description: m.beschreibung,
    color: k.farbe,
    fields: felder,
    footer: { text: `Stripe · ${m.ereignis}` },
  };
}

export type StripeKunde = { nr: string; name: string; email?: string | null; notionUrl?: string | null };

export type Dienste = {
  kunden: () => Promise<StripeKunde[] | null>;
  setzeStatus: (notionUrl: string, status: "Bezahlt" | "Offen") => Promise<boolean>;
  kundenKanal: (nr: string) => Promise<string | null>;
  posteingang: () => Promise<string | null>;
  schonGemeldet: (kanal: string, ereignis: string) => Promise<boolean>;
  poste: (kanal: string, karte: MeldungsKarte, hinweis: boolean) => Promise<boolean>;
  schickeMail: (betreff: string, text: string) => Promise<boolean>;
};

/**
 * Trägt eine Meldung ein: Zahlungsstatus in Notion, Karte in den Kundenkanal, bei Problemen eine Mail.
 * Ohne passenden Kunden landet die Karte im privaten #posteingang, damit keine Zahlung verloren geht.
 * false heißt: Stripe soll das Ereignis noch einmal schicken.
 */
export async function verarbeite(m: Meldung, d: Dienste): Promise<boolean> {
  const liste = await d.kunden();
  if (!liste) return false;
  const kunde = (m.kundeNr && liste.find((k) => k.nr === m.kundeNr)) || (m.email && liste.find((k) => k.email?.trim().toLowerCase() === m.email)) || null;

  const kanal = (kunde && (await d.kundenKanal(kunde.nr))) || (await d.posteingang());
  if (!kanal) return false;
  // Stripe kann dasselbe Ereignis mehrmals zustellen.
  if (await d.schonGemeldet(kanal, m.ereignis)) return true;

  const karte = meldungsKarte(m, kunde ? kunde.name : null);
  if (kunde && m.zahlungsstatus) {
    const gesetzt = kunde.notionUrl ? await d.setzeStatus(kunde.notionUrl, m.zahlungsstatus) : false;
    if (!gesetzt) karte.fields.push({ name: "Notion", value: `Zahlungsstatus konnte nicht gesetzt werden, bitte von Hand auf „${m.zahlungsstatus}“ stellen.`, inline: false });
  }
  if (!(await d.poste(kanal, karte, m.hinweis))) return false;

  if (m.mail) {
    const text = [karte.description, m.email && `E-Mail: ${m.email}`, m.link && `Stripe: ${m.link}`].filter(Boolean).join("\n");
    // Die Karte steht schon: Scheitert nur die Mail, soll Stripe nicht alles neu schicken.
    await d.schickeMail(karte.title.replace(/[\u200b]/g, ""), text).catch(() => false);
  }
  return true;
}
