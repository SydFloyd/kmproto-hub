import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KM Proto | Apps that do things.",
  description: "A small collection of useful digital projects from KM Proto.",
  metadataBase: new URL("https://kmproto.com"),
  openGraph: {
    title: "KM Proto | Apps that do things.",
    description: "A small collection of useful digital projects from KM Proto.",
    images: [{ url: "/og.png", width: 1730, height: 909 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KM Proto | Apps that do things.",
    description: "A small collection of useful digital projects from KM Proto.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
