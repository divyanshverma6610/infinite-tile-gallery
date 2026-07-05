import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { PWARegister } from "./pwa-register";

export const metadata: Metadata = {
  title: "Infinite Tile Gallery",
  description: "Draw pixel art tiles and build an infinite shared gallery.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TileGallery",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#111111",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-white text-[#111] antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
