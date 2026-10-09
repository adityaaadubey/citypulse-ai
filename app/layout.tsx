import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1
};

export const metadata: Metadata = {
  title: "CityPulse AI - Smart City Exploration & Situational Intelligence",
  description: "Next-generation city exploration dashboard powered by Google Gemini, OpenStreetMap, Open-Meteo, and Supabase.",
  keywords: [
    "smart city",
    "city exploration",
    "gemini ai",
    "openstreetmap",
    "pune",
    "situational intelligence",
    "citizen reporting",
    "geospatial"
  ],
  authors: [{ name: "CityPulse AI Team" }],
  openGraph: {
    title: "CityPulse AI - Smart City Exploration & Situational Intelligence",
    description: "Grounded AI itineraries, live OpenStreetMap discovery, and verified community situational reports.",
    url: "https://citypulse-ai-live.vercel.app",
    siteName: "CityPulse AI",
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "CityPulse AI",
    description: "Smart City Exploration Platform powered by Google Gemini & OpenStreetMap."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full bg-sand text-ink antialiased selection:bg-emerald-200 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
