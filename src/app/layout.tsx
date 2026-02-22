import type { Metadata } from "next";
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
        {children}
      </body>
    </html>
  );
}
