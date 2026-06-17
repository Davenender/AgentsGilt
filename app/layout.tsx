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
    "Agents Gilt entwickelt moderne Websites, KI-Chatbots, Voice-Agenten und Automatisierungen für kleine und mittlere Unternehmen. Einsatzbereit in Tagen, nicht Monaten.",
  openGraph: {
    title: "Agents Gilt – KI-Lösungen für lokale Unternehmen",
    description:
      "Moderne Websites, Chatbots, Voice-Agenten und Automatisierungen – schnell gebaut mit KI.",
    locale: "de_DE",
    type: "website",
    url: "https://agents-gilt.agency",
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
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
