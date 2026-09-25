import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TFE Ads Dashboard",
  description: "Ad management dashboard for the embeddable widget platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
