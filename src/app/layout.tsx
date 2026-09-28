import React from "react";
import "./globals.css";
import AnalyticsPixel from "@/components/AnalyticsPixel";
import CookieConsent from "@/components/CookieConsent";

export const metadata = {
  metadataBase: new URL("https://dkitchencorporate.es"),
  title: "DKitchen | Carta digital QR y digitalización para hostelería",
  description: "Carta digital con QR que no tienes que reimprimir nunca, eventos gastronómicos llave en mano y dark kitchen multimarca. Sin comisiones sobre tus ventas y sin tocar tu dinero.",
  keywords: ["carta digital qr restaurante", "kds dark kitchen", "menu qr hostelería", "digitalización restaurantes", "eventos gastronómicos llave en mano", "dark kitchen multimarca"],
  authors: [{ name: "DKitchen" }],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "DKitchen | Multiplica tus reservas en piloto automático",
    description: "Sistemas digitales de autor para hostelería inteligente. Deja de perder dinero en comisiones.",
    url: "https://dkitchencorporate.es",
    images: [{ url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1200", width: 1200, height: 630, alt: "DKitchen Hostelería" }],
    siteName: "DKitchen",
    type: "website",
  },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  twitter: {
    card: "summary_large_image",
    title: "DKitchen | Hostelería Inteligente",
    description: "Sistemas digitales de autor para restaurantes y Dark Kitchens.",
  }
};

import { Inter, Bricolage_Grotesque, Cormorant_Garamond } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
// Identidad 29/09/2026: titulares en Bricolage Grotesque; Cormorant para las cartas de muestra.
const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--fuente-display", display: "swap" });
const serifWeb = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--fuente-serif-web", display: "swap" });

const jsonLdOrganizacion = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "DKitchen",
  legalName: "DKitchen Corporate SL",
  url: "https://dkitchencorporate.es",
  logo: "https://dkitchencorporate.es/icon.svg",
  description: "Digitalización para hostelería: carta digital con QR, eventos gastronómicos llave en mano y dark kitchen multimarca.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Calle La Granja 1",
    addressLocality: "Alcobendas",
    postalCode: "28108",
    addressCountry: "ES",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+34-622-65-26-59",
    contactType: "customer service",
    areaServed: "ES",
    availableLanguage: "Spanish",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} ${display.variable} ${serifWeb.variable} bg-background text-foreground antialiased`}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganizacion) }}
        />
        <AnalyticsPixel />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
