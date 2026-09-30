import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MSI Ads Platform",
  description: "Universal multi-vendor advertising management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
