import type { Metadata } from "next";
import { LichtTest } from "@/components/neu/kopf/LichtTest";
import "./licht-test.css";

export const metadata: Metadata = {
  title: "Licht-Test – Agents Gilt",
};

/** Nur das Licht: Wand mit Logo-Loch, Lichtscheibe, God Rays, Filmkorn. */
export default function LichtTestSeite() {
  return <LichtTest />;
}
