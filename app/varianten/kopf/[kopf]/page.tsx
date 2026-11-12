import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RiesenSchriftzug } from "@/components/neu/aufbau/RiesenSchriftzug";
import { KopfBaender, KopfTiefe, KopfWolke } from "@/components/neu/kopf/Koepfe";
import { Seite } from "@/components/neu/seite/Seite";
import { KOPFBILDER, type KopfSlug } from "@/components/neu/kopf/kopfbilder";

// Die Zuordnung steht hier auf dem Server: Aus einer Client-Datei lassen sich
// nur einzelne Bauteile verwenden, keine Tabellen.
// „kern“ ist der gewählte Kopfbereich: Dort steht die neue Seite als Ganzes (components/neu/seite).
const KOEPFE: Record<Exclude<KopfSlug, "kern">, () => React.ReactNode> = {
  baender: KopfBaender,
  wolke: KopfWolke,
  tiefe: KopfTiefe,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return KOPFBILDER.map((k) => ({ kopf: k.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ kopf: string }> }): Promise<Metadata> {
  const { kopf } = await params;
  const eintrag = KOPFBILDER.find((k) => k.slug === kopf);
  return { title: eintrag ? `Kopfbild „${eintrag.name}“ – Agents Gilt` : "Kopfbild-Varianten – Agents Gilt" };
}

/**
 * Der gewählte Kopfbereich („kern“) zeigt die neue Seite. Die drei anderen sind Vergleichsstände:
 * die Seite im Aufbau „Riesen-Schriftzug“, nur der Kopfbereich ist je Variante anders.
 */
export default async function KopfSeite({ params }: { params: Promise<{ kopf: string }> }) {
  const { kopf } = await params;
  if (kopf === "kern") return <Seite />;
  const Kopf = KOEPFE[kopf as Exclude<KopfSlug, "kern">];
  if (!Kopf) notFound();
  return <RiesenSchriftzug kopf={<Kopf />} />;
}
