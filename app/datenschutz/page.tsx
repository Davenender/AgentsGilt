import type { Metadata } from "next";
import { RechtSeite } from "@/components/neu/recht/RechtSeite";
import { Welt } from "@/components/neu/Welt";

export const metadata: Metadata = {
  title: "Datenschutz – Agents Gilt",
  robots: { index: false },
};

// Im Design der neuen Seite (seit 14.11.2026). Der Wortlaut steht unverändert in
// components/neu/recht/Rechtstexte.tsx.
export default function DatenschutzPage() {
  return (
    <Welt>
      <RechtSeite art="datenschutz" />
    </Welt>
  );
}
