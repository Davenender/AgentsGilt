import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { ChatWidget } from "@/components/ChatWidget";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-head",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://agentsgilt.com"),
  title: "Agents Gilt – KI-Lösungen für lokale Unternehmen",
  description:
    "Agents Gilt entwickelt moderne Websites, KI-Chatbots, Voice-Agenten und Automatisierungen für kleine und mittlere Unternehmen.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Agents Gilt – KI-Lösungen für lokale Unternehmen",
    description:
      "Moderne Websites, Chatbots, Voice-Agenten und Automatisierungen – schnell gebaut mit KI.",
    locale: "de_DE",
    type: "website",
    url: "https://agentsgilt.com",
    siteName: "Agents Gilt",
    images: [
      {
        url: "/logo-full.png",
        width: 1774,
        height: 887,
        alt: "Agents Gilt – KI-Lösungen für lokale Unternehmen",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agents Gilt – KI-Lösungen für lokale Unternehmen",
    description:
      "Moderne Websites, Chatbots, Voice-Agenten und Automatisierungen – schnell gebaut mit KI.",
    images: ["/logo-full.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://agentsgilt.com",
  name: "Agents Gilt",
  image: "https://agentsgilt.com/logo-full.png",
  logo: "https://agentsgilt.com/logo-full.png",
  url: "https://agentsgilt.com",
  email: "kontakt@agents-gilt.agency",
  telephone: "+4916098427943",
  founder: "David Hesse",
  priceRange: "€€",
  description:
    "KI-Lösungen für lokale Unternehmen: moderne Websites, Chatbots, Voice-Agenten und Automatisierungen.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Lämmerspieler Straße 100",
    postalCode: "63165",
    addressLocality: "Mühlheim am Main",
    addressCountry: "DE",
  },
  // Einzugsgebiet – passend zum Google-Unternehmensprofil
  areaServed: [
    { "@type": "City", name: "Mühlheim am Main" },
    { "@type": "City", name: "Offenbach am Main" },
    { "@type": "City", name: "Frankfurt am Main" },
    { "@type": "City", name: "Hanau" },
  ],
  // Fachgebiete – damit KI/Google sofort versteht, worum es geht
  knowsAbout: [
    "Künstliche Intelligenz",
    "KI-Agenten",
    "Chatbots",
    "Voice-Agenten",
    "Automatisierung",
    "Webdesign",
    "Website-Entwicklung",
  ],
  // Verknüpfte Profile
  sameAs: ["https://www.tiktok.com/@agents.gilt"],
  // Bewusst KEINE openingHoursSpecification – Kontakt läuft über Formular,
  // E-Mail und WhatsApp; falsche Zeiten wären irreführend.
};

// Sagt Google, dass der Seitenname "Agents Gilt" lautet (statt der Domain).
const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Agents Gilt",
  alternateName: "Agents Gilt Agency",
  url: "https://agentsgilt.com",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${inter.variable} ${sora.variable} antialiased`}
    >
      <body className="bg-cream text-ink font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <ChatWidget />
        {/* Cookiefreie, anonyme Besucherstatistik – kein Consent-Banner nötig */}
        <Analytics />
      </body>
    </html>
  );
}
