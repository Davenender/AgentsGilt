import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RiesenSchriftzug } from "@/components/neu/aufbau/RiesenSchriftzug";
import { KopfBaender, KopfKern, KopfTiefe, KopfWolke } from "@/components/neu/kopf/Koepfe";
import { KOPFBILDER, type KopfSlug } from "@/components/neu/kopf/kopfbilder";

// Die Zuordnung steht hier auf dem Server: Aus einer Client-Datei lassen sich
// nur einzelne Bauteile verwenden, keine Tabellen.
const KOEPFE: Record<KopfSlug, () => React.ReactNode> = {
  kern: KopfKern,
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

/** Die ganze Seite im Aufbau „Riesen-Schriftzug“, nur der Kopfbereich ist je Variante anders. */
export default async function KopfSeite({ params }: { params: Promise<{ kopf: string }> }) {
  const { kopf } = await params;
  const Kopf = KOEPFE[kopf as KopfSlug];
  if (!Kopf) notFound();
  return <RiesenSchriftzug kopf={<Kopf />} />;
}
