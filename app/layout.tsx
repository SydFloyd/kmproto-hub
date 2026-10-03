import type { Metadata } from "next";
import "./globals.css";

const title = "KM Proto | Websites, automation & custom software";
const description = "Websites, workflow automation and custom software for small businesses in lower Bucks County. Work directly with Kyle, with in-person meetings by appointment.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://kmproto.com"),
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg" },
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
      <body>{children}</body>
    </html>
  );
}
