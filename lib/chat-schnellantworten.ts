// Die fertigen Sätze hinter dem Knopf „💬 Schnellantwort“ an der Ticket-Karte (Prompt 17, 23.11.2026).
// Das Team wählt einen, kann ihn im Fenster noch ändern, und er geht als ganz normale Antwort mit dem
// eigenen Namen an den Kunden. Neue Sätze einfach hier ergänzen (höchstens 25, je höchstens 100 Zeichen:
// so viel erlaubt die Auswahl in Discord). Der Chat duzt.
export const SCHNELLANTWORTEN = [
  "Einen Moment, ich schaue kurz nach.",
  "Danke für deine Geduld!",
  "Bitte bleib sachlich, sonst müssen wir den Chat beenden.",
  "Wir melden uns per E-Mail bei dir.",
  // Wir rufen Kunden nicht zurück: Der Kunde ruft an, der Telefon-Assistent macht den Termin (Prompt 18).
  "Am schnellsten klären wir das am Telefon: Ruf uns einfach an.",
] as const;
// Der Abschluss-Satz steht nicht mehr hier (Prompt 18): Er kommt nur über den Knopf „Abschluss“
// (lib/support-ablauf.ts), damit die Reihenfolge „Noch Fragen?“ → „Abschluss“ → „Ticket schließen“ hält.
