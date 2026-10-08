import Solicitud from '@/components/Solicitud';
import React from "react";
import "./globals.css";
import AnalyticsPixel from "@/components/AnalyticsPixel";
import CookieConsent from "@/components/CookieConsent";
import AnaliticaWeb from "@/components/AnaliticaWeb";
import CapturaVendedor from "@/components/CapturaVendedor";

export const metadata = {
  metadataBase: new URL("https://dkitchencorporate.es"),
  title: "DKitchen | Carta digital QR y digitalización para hostelería",
  description: "Carta digital con QR que no tienes que reimprimir nunca, eventos gastronómicos llave en mano y dark kitchen multimarca. Sin comisiones sobre tus ventas y sin tocar tu dinero.",
  keywords: ["carta digital qr restaurante", "menú qr", "app propia restaurante sin comisiones", "digitalización restaurantes", "eventos para restaurantes", "dark kitchen multimarca", "marcas virtuales", "alérgenos carta"],
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
  // La imagen para compartir la genera cada página (opengraph-image.tsx).
  openGraph: {
    title: "DKitchen · Tu restaurante, con sistema propio",
    description: "Carta digital QR desde 1 €, tu propia app de pedidos sin comisiones, eventos llave en mano y dark kitchen multimarca.",
    url: "https://dkitchencorporate.es",
    siteName: "DKitchen",
    locale: "es_ES",
    type: "website",
  },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon-96.png", sizes: "96x96", type: "image/png" }, { url: "/favicon-48.png", sizes: "48x48", type: "image/png" }, { url: "/favicon-32.png", sizes: "32x32", type: "image/png" }], apple: "/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  twitter: {
    card: "summary_large_image",
    title: "DKitchen · Tu restaurante, con sistema propio",
    description: "Carta digital QR, apps propias sin comisiones, eventos y dark kitchen para hostelería.",
  }
};

import { Inter, Bricolage_Grotesque, Cormorant_Garamond } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
// Identidad 29/09/2026: titulares en Bricolage Grotesque; Cormorant para las cartas de muestra.
const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--fuente-display", display: "swap" });
const serifWeb = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--fuente-serif-web", display: "swap" });

// NAP coherente con Google Business (08/10/2026): empresa de área de servicio en
// toda España, sin calle publicada. `sameAs` enlaza los perfiles oficiales para
// que Google una la web, la ficha y las redes en una sola entidad.
const jsonLdOrganizacion = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://dkitchencorporate.es/#organizacion",
  name: "DKitchen",
  alternateName: "DKitchen Corporate",
  url: "https://dkitchencorporate.es",
  logo: "https://dkitchencorporate.es/icon-512.png",
  image: "https://dkitchencorporate.es/icon-512.png",
  description: "Digitalización para hostelería sin comisiones: carta digital con QR, app de pedidos propia, eventos gastronómicos llave en mano y dark kitchen multimarca.",
  foundingDate: "2020",
  email: "dkitchen@dkitchencorporate.es",
  telephone: "+34622652659",
  address: { "@type": "PostalAddress", addressCountry: "ES" },
  areaServed: { "@type": "Country", name: "España" },
  sameAs: [
    "https://www.instagram.com/dkitchen_es/",
    "https://www.facebook.com/dkitchencorporate",
    "https://www.tiktok.com/@dkitchencorporate",
    "https://x.com/dkitchen_es",
    "https://www.linkedin.com/company/dkitchencorporate/",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+34622652659",
    email: "dkitchen@dkitchencorporate.es",
    contactType: "customer service",
    areaServed: "ES",
    availableLanguage: "Spanish",
  },
};

const jsonLdWeb = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://dkitchencorporate.es/#web",
  name: "DKitchen",
  url: "https://dkitchencorporate.es",
  inLanguage: "es-ES",
  publisher: { "@id": "https://dkitchencorporate.es/#organizacion" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} ${display.variable} ${serifWeb.variable} bg-background text-foreground antialiased`}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLdOrganizacion, jsonLdWeb]) }}
        />
        <AnalyticsPixel />
        {children}
        <Solicitud />
        <CookieConsent />
        <AnaliticaWeb />
        <CapturaVendedor />
      </body>
    </html>
  );
}
