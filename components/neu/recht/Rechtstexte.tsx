// Die Texte von Impressum und Datenschutzerklärung.
//
// RECHTLICH WICHTIG: Der Wortlaut ist unverändert aus den bisherigen Seiten übernommen
// (app/impressum/page.tsx und app/datenschutz/page.tsx, Stand 14.11.2026). Hier nur ändern, wenn
// sich der Inhalt wirklich ändern soll; die Gestaltung steht in recht.css.
// Beide Texte werden an zwei Stellen gezeigt: als eigene Seite (/impressum, /datenschutz) und als
// Blatt über der neuen Seite (RechtBlatt.tsx).

export const RECHT_TITEL = { impressum: "Impressum", datenschutz: "Datenschutzerklärung" } as const;
/** Der Titel des Tabs, wie auf den eigenen Seiten (app/impressum, app/datenschutz). */
export const RECHT_TAB = { impressum: "Impressum – Agents Gilt", datenschutz: "Datenschutz – Agents Gilt" } as const;
export type RechtArt = keyof typeof RECHT_TITEL;

export function ImpressumText() {
  return (
    <>
      <div>
        <h2>
          Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)
        </h2>
        <p>
          David Hesse
          <br />
          Agents Gilt (Einzelunternehmen)
          <br />
          Lämmerspieler Straße 100
          <br />
          63165 Mühlheim am Main
          <br />
          Deutschland
        </p>
      </div>

      <div>
        <h2>Kontakt</h2>
        <p>
          E-Mail: kontakt@agentsgilt.com
          <br />
          Telefon: +49 6108 9694027
        </p>
      </div>

      <div>
        <h2>Umsatzsteuer</h2>
        <p>
          Als Kleinunternehmer im Sinne von § 19 UStG wird keine Umsatzsteuer
          ausgewiesen.
        </p>
      </div>

      <div>
        <h2>
          Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
        </h2>
        <p>
          David Hesse (Anschrift wie oben)
        </p>
      </div>

      <div>
        <h2>
          Verbraucherstreitbeilegung
        </h2>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
          vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </div>

      <div>
        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach
          den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht
          verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
          überwachen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung
          von Informationen nach den allgemeinen Gesetzen bleiben hiervon
          unberührt.
        </p>
      </div>
    </>
  );
}

export function DatenschutzText() {
  return (
    <>
      <div>
        <h2>
          1. Verantwortlicher
        </h2>
        <p>
          David Hesse · Agents Gilt
          <br />
          Lämmerspieler Straße 100, 63165 Mühlheim am Main, Deutschland
          <br />
          E-Mail: kontakt@agentsgilt.com
        </p>
      </div>

      <div>
        <h2>
          2. Hosting (Vercel)
        </h2>
        <p>
          Diese Website wird bei Vercel Inc. (USA) gehostet. Beim Aufruf der Seite
          verarbeitet Vercel technisch erforderliche Server-Log-Daten (z.&nbsp;B.
          IP-Adresse, Datum/Uhrzeit, abgerufene Seite, Browsertyp), um die
          Auslieferung und Sicherheit der Website zu gewährleisten.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          am sicheren Betrieb). Eine Übermittlung in die USA erfolgt auf Grundlage
          der EU-Standardvertragsklauseln.
        </p>
      </div>

      <div>
        <h2>
          3. Kontaktformular
        </h2>
        <p>
          Wenn du uns über das Kontaktformular eine Anfrage schickst, verarbeiten
          wir deine Angaben (Name, E-Mail-Adresse, optional Unternehmen,
          gewünschte Leistung und deine Nachricht) ausschließlich zur Bearbeitung
          deiner Anfrage. Der technische Versand der E-Mails erfolgt über unseren
          Dienstleister Resend (Resend, Inc., USA) als Auftragsverarbeiter.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Anbahnung/Erfüllung
          eines Vertrags) bzw. lit. f DSGVO. Die Daten werden gelöscht, sobald sie
          für die Bearbeitung nicht mehr erforderlich sind.
        </p>
      </div>

      <div>
        <h2>
          4. KI-Chat-Assistent
        </h2>
        <p>
          Auf der Website kannst du freiwillig einen KI-Chat-Assistenten nutzen.
          Deine eingegebenen Nachrichten werden zur Erzeugung einer Antwort an
          unseren Dienstleister Anthropic (Anthropic PBC, USA) übermittelt und
          dort verarbeitet. Bitte gib im Chat keine sensiblen oder besonders
          schützenswerten personenbezogenen Daten ein. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer schnellen
          Beantwortung von Anfragen). Eine Übermittlung in die USA erfolgt auf
          Grundlage der EU-Standardvertragsklauseln.
        </p>
        <p>
          Damit wir erkennen, welche Fragen häufig gestellt werden und wo
          unsere Antworten nicht weiterhelfen, wird der Gesprächsverlauf beim
          Verlassen der Seite an uns übermittelt und dort ausgewertet. Dabei
          werden keine Daten an Dritte weitergegeben, die über die oben
          genannten Dienstleister hinausgehen. Die Verläufe werden gelöscht,
          sobald sie für diesen Zweck nicht mehr erforderlich sind.
        </p>
        <p>
          Möchtest du im Chat mit einem Mitarbeiter sprechen, gibst du dafür
          freiwillig deinen Namen, eine E-Mail-Adresse oder Telefonnummer und
          dein Anliegen an. Diese Angaben und der bisherige Chatverlauf werden
          an unser Team übergeben und dort in einem internen, nur für unser
          Team sichtbaren Kanal bei Discord Inc. (USA) bearbeitet; zusätzlich
          erhalten wir eine E-Mail über die Anfrage. Deine Antworten und
          unsere Rückfragen laufen über diesen Kanal. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. b DSGVO (Beantwortung deiner Anfrage). Die Daten
          werden gelöscht, sobald dein Anliegen erledigt ist und keine
          Aufbewahrungspflichten entgegenstehen. Die Übermittlung in die USA
          erfolgt auf Grundlage der EU-Standardvertragsklauseln.
        </p>
      </div>

      <div>
        <h2>
          5. Telefonischer KI-Assistent (Voice-Agent)
        </h2>
        <p>
          Rufst du unsere Telefonnummer an, nimmt zunächst ein KI-gestützter
          Telefonassistent das Gespräch entgegen. Er weist zu Beginn des
          Gesprächs darauf hin, dass es sich um eine KI handelt. Du kannst
          jederzeit verlangen, mit einem Menschen zu sprechen; das Gespräch wird
          dann weitergeleitet.
        </p>
        <p>
          Dabei werden verarbeitet: deine Rufnummer, der Zeitpunkt und die Dauer
          des Anrufs sowie die Inhalte des Gesprächs. Das gesprochene Wort wird
          zur Verarbeitung in Text umgewandelt, eine Antwort erzeugt und wieder
          als Sprache ausgegeben. Nennst du uns dabei Angaben wie Namen,
          Rufnummer oder einen Terminwunsch, verarbeiten wir diese zur
          Bearbeitung deines Anliegens.
        </p>
        <p>
          Eingesetzte Dienstleister als Auftragsverarbeiter: Twilio Inc. (USA)
          für die Telefonie sowie Vapi Labs, Inc. (USA) für den Betrieb des
          Sprachassistenten; dabei kommen Dienste zur Spracherkennung,
          Sprachausgabe und Sprachverarbeitung zum Einsatz. Eine Übermittlung in
          die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln.
        </p>
        <p>
          Das Gespräch wird aufgezeichnet. Darauf weisen wir dich zu Beginn
          des Telefonats ausdrücklich hin, bevor du dein Anliegen schilderst.
          Setzt du das Gespräch nach diesem Hinweis fort, verstehen wir das
          als Einwilligung in die Aufzeichnung (Art. 6 Abs. 1 lit. a DSGVO).
          Möchtest du das nicht, sag es einfach — dann brechen wir die
          Aufzeichnung ab und du kannst uns stattdessen per E-Mail erreichen.
          Eine bereits erteilte Einwilligung kannst du jederzeit für die
          Zukunft widerrufen; melde dich dazu an kontakt@agentsgilt.com.
        </p>
        <p>
          Die Aufzeichnung dient dazu, dein Anliegen korrekt zu erfassen und
          die Qualität unseres Assistenten zu verbessern. Zusätzlich erhalten
          wir nach dem Gespräch eine Zusammenfassung sowie eine Textfassung
          per E-Mail, damit wir dein Anliegen bearbeiten und dich zurückrufen
          können. Aufzeichnungen werden gelöscht, sobald sie für diese Zwecke
          nicht mehr erforderlich sind.
        </p>
        <p>
          Vereinbarst du am Telefon einen Termin, schicken wir dir an deine
          Handynummer eine SMS mit der Bestätigung oder einem anderen
          Terminvorschlag. Ein Vorschlag enthält einen Link auf agentsgilt.com,
          über den du ihn annehmen oder einen anderen Termin wünschen kannst.
          Kann der Termin nicht per SMS geklärt werden (zum Beispiel bei einer
          Festnetznummer) oder erreichen wir dich nicht, ruft dich unser
          KI-Telefonassistent unter der Nummer an, die du uns genannt hast, und
          fragt, ob der Termin passt.
          Für den SMS-Versand nutzen wir Twilio Inc. (USA) als
          Auftragsverarbeiter. Damit wir dein Anliegen im Team abstimmen
          können, legen wir Name, Rückrufnummer, Terminwunsch und eine kurze
          Zusammenfassung des Gesprächs in einem internen, nur für unser Team
          sichtbaren Kanal bei Discord Inc. (USA) ab. Auch hier erfolgt die
          Übermittlung in die USA auf Grundlage der EU-Standardvertragsklauseln.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung
          vorvertraglicher Maßnahmen auf deine Anfrage hin) sowie Art. 6 Abs. 1
          lit. f DSGVO (berechtigtes Interesse an einer durchgehenden
          Erreichbarkeit). Die Daten werden gelöscht, sobald sie für die
          Bearbeitung nicht mehr erforderlich sind. Bitte teile am Telefon keine
          sensiblen oder besonders schützenswerten personenbezogenen Daten mit.
        </p>
      </div>

      <div>
        <h2>
          6. WhatsApp-Kontakt
        </h2>
        <p>
          Wenn du den WhatsApp-Button nutzt, wirst du zu WhatsApp (Meta Platforms
          Ireland Ltd.) weitergeleitet. Für die Verarbeitung deiner Daten bei
          WhatsApp gelten die Datenschutzbestimmungen von Meta. Die Nutzung ist
          freiwillig.
        </p>
      </div>

      <div>
        <h2>
          7. Bezahlung über Stripe
        </h2>
        <p>
          Kundinnen und Kunden bezahlen unsere Leistungen über einen Zahlungslink
          von Stripe. Die Bezahlseite, die Eingabe der Zahlungsdaten und die Seite
          zum Erneuern einer Karte liegen direkt bei Stripe. Vollständige
          Kartendaten sehen und speichern wir nicht.
        </p>
        <p>
          Dabei werden verarbeitet: Name oder Firma, Rechnungsadresse,
          E-Mail-Adresse, Zahlungsart und Zahlungsdaten sowie Betrag, Datum und
          Status der Zahlungen. Stripe verschickt Belege, Rechnungen und Hinweise
          zu fehlgeschlagenen Zahlungen oder ablaufenden Karten per E-Mail. Den
          Zahlungsstatus halten wir in unserer Kundenverwaltung bei Notion Labs,
          Inc. (USA) fest und melden ihn in einem internen, nur für unser Team
          sichtbaren Kanal bei Discord Inc. (USA).
        </p>
        <p>
          Anbieter sind die Stripe-Gesellschaften in Irland (Stripe Technology
          Company, Limited und Stripe Payments Europe, Limited). Stripe handelt
          teils als unser Auftragsverarbeiter und teils in eigener Verantwortung,
          etwa zur Betrugsvermeidung und wegen gesetzlicher Pflichten. Näheres
          steht in der{" "}
          <a href="https://stripe.com/de/privacy" target="_blank" rel="noreferrer">
            Datenschutzerklärung von Stripe
          </a>
          . Eine Übermittlung in die USA erfolgt auf Grundlage der
          EU-Standardvertragsklauseln.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des Vertrags)
          und für Rechnungen Art. 6 Abs. 1 lit. c DSGVO (gesetzliche
          Aufbewahrungspflichten). Rechnungsdaten bewahren wir so lange auf, wie
          es das Steuer- und Handelsrecht verlangt.
        </p>
      </div>

      <div>
        <h2>
          8. Verträge über Docusign
        </h2>
        <p>
          Verträge schicken wir zur elektronischen Unterschrift über Docusign.
          Dabei werden verarbeitet: Namen und E-Mail-Adressen der Unterschreibenden,
          die Vertragsdokumente samt eingetragener Firmendaten, die Unterschrift
          sowie Zeitpunkt, IP-Adresse und Angaben zum Gerät als Nachweis der
          Unterschrift. Das fertige Dokument bewahren wir bei uns auf.
        </p>
        <p>
          Anbieter ist Docusign, Inc. (USA) mit ihren europäischen Gesellschaften,
          als unser Auftragsverarbeiter. Eine Übermittlung in die USA erfolgt auf
          Grundlage geeigneter Garantien wie der EU-Standardvertragsklauseln.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Abschluss und Erfüllung
          des Vertrags). Die Daten werden gelöscht, sobald sie nicht mehr
          erforderlich sind und keine Aufbewahrungspflichten entgegenstehen.
        </p>
      </div>

      <div>
        <h2>
          9. Keine Tracking-Cookies
        </h2>
        <p>
          Diese Website setzt keine Analyse- oder Marketing-Cookies und nutzt kein
          Tracking. Es werden nur technisch notwendige Daten für den Betrieb der
          Seite verarbeitet.
        </p>
      </div>

      <div>
        <h2>
          10. Deine Rechte
        </h2>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung
          der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wende dich dazu
          an kontakt@agentsgilt.com. Außerdem hast du ein Beschwerderecht bei
          einer Datenschutz-Aufsichtsbehörde.
        </p>
      </div>

      <p className="ag-recht__hinweis">
        Hinweis: Diese Datenschutzerklärung deckt den aktuellen Funktionsumfang
        der Website ab. Bei rechtlicher Unsicherheit empfiehlt sich eine Prüfung
        durch eine fachkundige Person.
      </p>
    </>
  );
}
