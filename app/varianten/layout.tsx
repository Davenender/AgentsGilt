import type { Metadata } from "next";
import { Cutive_Mono, Gloock, Sofia_Sans, Sofia_Sans_Extra_Condensed } from "next/font/google";
import "./welt.css";

// Schriften der neuen Welt (nicht Inter): kräftige schmale Großbuchstaben,
// eine aufrechte Serife für die goldenen Betonungswörter, eine ruhige Grotesk
// für Fließtext und eine Schreibmaschinen-Schrift nur für Status und Nummern.
const versal = Sofia_Sans_Extra_Condensed({ subsets: ["latin"], weight: ["800"], variable: "--font-versal", display: "swap" });
const text = Sofia_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-text", display: "swap" });
const serife = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-serife", display: "swap" });
const mono = Cutive_Mono({ subsets: ["latin"], weight: "400", variable: "--font-mono-ag", display: "swap" });

// Die Varianten sind Arbeitsstände zum Vergleichen: nicht für Suchmaschinen.
export const metadata: Metadata = {
  title: "Aufbau-Varianten – Agents Gilt",
  robots: { index: false, follow: false },
};

export default function VariantenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ag-neu ${versal.variable} ${text.variable} ${serife.variable} ${mono.variable}`}>
      {/* Ohne JavaScript gibt es keinen Ladebildschirm: Die Seite ist sofort da. */}
      <noscript>
        <style>{".ag-lade{display:none}"}</style>
      </noscript>
      {children}
    </div>
  );
}
