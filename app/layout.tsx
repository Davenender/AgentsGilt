import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { ChatWidget } from "@/components/ChatWidget";

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
  metadataBase: new URL("https://agents-gilt.agency"),
  title: "Agents Gilt – KI-Lösungen für lokale Unternehmen",
  description:
    "Agents Gilt baut moderne Websites, KI-Chatbots, Voice-Agenten und Automatisierungen für kleine und mittlere Unternehmen – einsatzbereit in Tagen.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Agents Gilt – KI-Lösungen für lokale Unternehmen",
    description:
      "Moderne Websites, Chatbots, Voice-Agenten und Automatisierungen – schnell gebaut mit KI.",
    locale: "de_DE",
    type: "website",
    url: "https://agents-gilt.agency",
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
  name: "Agents Gilt",
  image: "https://agents-gilt.agency/logo-full.png",
  url: "https://agents-gilt.agency",
  email: "kontakt@agents-gilt.agency",
  telephone: "+4916098427943",
  founder: "David Hesse",
  priceRange: "€€",
  areaServed: "DE",
  description:
    "KI-Lösungen für lokale Unternehmen: moderne Websites, Chatbots, Voice-Agenten und Automatisierungen.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Lämmerspieler Straße 100",
    postalCode: "63165",
    addressLocality: "Mühlheim am Main",
    addressCountry: "DE",
  },
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
