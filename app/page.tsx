import { Welt } from "@/components/neu/Welt";
import { Seite } from "@/components/neu/seite/Seite";

// Die Startseite (seit dem 15.11.2026 die neue Seite; vorher lag sie unter /varianten/kopf/kern).
// Titel, Beschreibung, Vorschaubild und kanonische Adresse kommen aus dem Stammlayout
// (app/layout.tsx); die Seite ist für Suchmaschinen freigegeben.
export default function Startseite() {
  return (
    // Schriften und Stylesheet der neuen Welt: components/neu/Welt.tsx.
    <Welt>
      {/* Ohne JavaScript gibt es keine Startanimation: Die Seite ist sofort da. */}
      <noscript>
        <style>{".ag-ln__standbild{display:block}.ag-ln__stern{display:none}.ag-kopf,.ag-chat{opacity:1!important;animation:none!important}.ag-wf__innen{opacity:1!important;transform:none!important;filter:none!important}.ag-schluss .ag-wortmarke{opacity:1!important}.ag-stern__auf{opacity:1!important;scale:1!important}.ag-stern__mitte{scale:1!important}"}</style>
      </noscript>
      <Seite />
    </Welt>
  );
}
