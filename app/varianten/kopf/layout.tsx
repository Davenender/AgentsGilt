import type { Metadata } from "next";
import "./kopf.css";

// Kopfbild-Varianten (Schritt 4) im gewählten Aufbau „Riesen-Schriftzug“.
// Wie alle Varianten nicht für Suchmaschinen (robots kommt aus dem Layout darüber).
export const metadata: Metadata = {
  title: "Kopfbild-Varianten – Agents Gilt",
};

export default function KopfLayout({ children }: { children: React.ReactNode }) {
  return children;
}
