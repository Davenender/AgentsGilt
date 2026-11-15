import type { Metadata } from "next";
import { RechtSeite } from "@/components/neu/recht/RechtSeite";
import { Welt } from "@/components/neu/Welt";

export const metadata: Metadata = {
  title: "Impressum – Agents Gilt",
  robots: { index: false },
};

// Im Design der neuen Seite (seit 14.11.2026). Der Wortlaut steht unverändert in
// components/neu/recht/Rechtstexte.tsx.
export default function ImpressumPage() {
  return (
    <Welt>
      <RechtSeite art="impressum" />
    </Welt>
  );
}
