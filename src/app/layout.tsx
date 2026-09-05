import type { Metadata, Viewport } from "next";
import "./globals.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * WhatsApp reads Open Graph tags to build its link preview, and it will only
 * fetch an **absolute** image URL — a relative one silently yields no
 * thumbnail, which is the usual reason a shared link looks like bare text.
 */
const SITE = "https://cryptofedge.github.io/lamesadelreino-campanas";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "La Mesa del Reino — Campañas",
  description:
    "Centro de campañas de La Mesa del Reino: ideas, publicaciones y anuncios en un solo lugar.",

  icons: {
    icon: [
      { url: `${BASE}/favicon.ico`, sizes: "any" },
      { url: `${BASE}/favicon-32.png`, type: "image/png", sizes: "32x32" },
      { url: `${BASE}/favicon-16.png`, type: "image/png", sizes: "16x16" },
    ],
    apple: `${BASE}/apple-touch-icon.png`,
  },

  openGraph: {
    type: "website",
    siteName: "La Mesa del Reino",
    title: "La Mesa del Reino — Centro de Campañas",
    description:
      "Ideas, posts y anuncios de cada episodio, en un solo lugar.",
    url: SITE,
    images: [
      {
        url: `${SITE}/og.jpg`,
        width: 1200,
        height: 630,
        alt: "La Mesa del Reino",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "La Mesa del Reino — Centro de Campañas",
    description: "Ideas, posts y anuncios de cada episodio, en un solo lugar.",
    images: [`${SITE}/og.jpg`],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0a10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
