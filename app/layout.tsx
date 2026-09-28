import type { Metadata } from "next";
import "./globals.css";

const title = "KM Proto | Websites, AI automation & custom software";
const description =
  "Practical technology for small businesses. Websites, AI automation and custom software, designed and built by an independent developer who answers his own email.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://kmproto.com"),
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "https://kmproto.com",
    siteName: "KM Proto",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
