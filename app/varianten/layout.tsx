import type { Metadata } from "next";
import { Welt } from "@/components/neu/Welt";

// Die Varianten sind Arbeitsstände zum Vergleichen: nicht für Suchmaschinen.
export const metadata: Metadata = {
  title: "Aufbau-Varianten – Agents Gilt",
  robots: { index: false, follow: false },
};

export default function VariantenLayout({ children }: { children: React.ReactNode }) {
  return (
    // Schriften und Stylesheet der neuen Welt: components/neu/Welt.tsx.
    <Welt>
      {/* Ohne JavaScript gibt es keinen Ladebildschirm: Die Seite ist sofort da. */}
      <noscript>
        <style>{".ag-lade{display:none}.ag-ln__standbild{display:block}.ag-ln__stern{display:none}.ag-kopf,.ag-chat{opacity:1!important;animation:none!important}.ag-wf__innen{opacity:1!important;transform:none!important;filter:none!important}.ag-schluss .ag-wortmarke{opacity:1!important}.ag-stern__auf{opacity:1!important;scale:1!important}.ag-stern__mitte{scale:1!important}"}</style>
      </noscript>
      {children}
    </Welt>
  );
}
