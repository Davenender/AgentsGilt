import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Seit dem 15.11.2026 ist die neue Seite die Startseite. Die früheren Arbeitsstände unter
  // /varianten (Übersicht, Aufbauten, Kopfbilder, Licht-Test) gibt es nicht mehr: Jede dieser
  // Adressen führt dauerhaft (308) auf die Startseite.
  async redirects() {
    return [
      { source: "/varianten", destination: "/", permanent: true },
      { source: "/varianten/:pfad*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
