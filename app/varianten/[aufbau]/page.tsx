import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Kartenstapel } from "@/components/neu/aufbau/Kartenstapel";
import { RiesenSchriftzug } from "@/components/neu/aufbau/RiesenSchriftzug";
import { Umlaufbahn } from "@/components/neu/aufbau/Umlaufbahn";
import { AUFBAUTEN, type AufbauSlug } from "@/components/neu/aufbauten";

const SEITEN: Record<AufbauSlug, () => React.ReactNode> = {
  "riesen-schriftzug": RiesenSchriftzug,
  kartenstapel: Kartenstapel,
  umlaufbahn: Umlaufbahn,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return AUFBAUTEN.map((a) => ({ aufbau: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ aufbau: string }> }): Promise<Metadata> {
  const { aufbau } = await params;
  const eintrag = AUFBAUTEN.find((a) => a.slug === aufbau);
  return { title: eintrag ? `Aufbau „${eintrag.name}“ – Agents Gilt` : "Aufbau-Varianten – Agents Gilt" };
}

export default async function AufbauSeite({ params }: { params: Promise<{ aufbau: string }> }) {
  const { aufbau } = await params;
  const Seite = SEITEN[aufbau as AufbauSlug];
  if (!Seite) notFound();
  return <Seite />;
}
