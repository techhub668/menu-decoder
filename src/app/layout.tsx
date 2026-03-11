import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "MenuDecoder - Translate Foreign Menus",
  description:
    "Helps tourists translate foreign menus, view dish photos, and discover top dishes at restaurants based on public reviews.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Script
          src="https://crypto-analytics-dashboard-sand.vercel.app/tracker.js"
          data-site="menu"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
