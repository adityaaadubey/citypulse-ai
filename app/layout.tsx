import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CityPulse AI",
  description: "A transparent city exploration dashboard for Pune and beyond."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
