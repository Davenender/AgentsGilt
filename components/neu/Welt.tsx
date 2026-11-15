import { Gloock, JetBrains_Mono, Sofia_Sans, Sofia_Sans_Extra_Condensed } from "next/font/google";
import type { ReactNode } from "react";
import "./welt.css";

// Schriften der neuen Welt (nicht Inter): kräftige schmale Großbuchstaben,
// eine aufrechte Serife für die goldenen Betonungswörter, eine ruhige Grotesk
// für Fließtext und eine Schreibmaschinen-Schrift nur für Status und Nummern.
const versal = Sofia_Sans_Extra_Condensed({ subsets: ["latin"], weight: ["800"], variable: "--font-versal", display: "swap" });
const text = Sofia_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-text", display: "swap" });
const serife = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-serife", display: "swap" });
// JetBrains Mono (ersetzt Cutive Mono): für den Namen aus Zeichen, die fliegenden Zeichen, das
// Verwürfeln und die kleinen Status-Zeilen.
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-ag", display: "swap" });

const SCHRIFTEN = `${versal.variable} ${text.variable} ${serife.variable} ${mono.variable}`;

/**
 * Die Hülle der neuen Welt: ihre Schriften und ihr Stylesheet (welt.css gilt nur innerhalb von
 * `.ag-neu`). Sie umschließt die Startseite (app/page.tsx), Impressum und Datenschutz.
 */
export function Welt({ children }: { children: ReactNode }) {
  return <div className={`ag-neu ${SCHRIFTEN}`}>{children}</div>;
}

/**
 * Hülle für den Chat der neuen Welt (Kugel und Glasfenster), einmal im Stammlayout für alle Seiten.
 * Sie bringt nur Schriften und Werte der neuen Welt mit und zeichnet selbst keinen Kasten
 * (`.ag-neu--chat`: display: contents): Auch auf Seiten im alten Aussehen (Terminseite, „nicht
 * gefunden“) ändert sie sonst nichts.
 */
export function WeltChat({ children }: { children: ReactNode }) {
  return <div className={`ag-neu ag-neu--chat ${SCHRIFTEN}`}>{children}</div>;
}
