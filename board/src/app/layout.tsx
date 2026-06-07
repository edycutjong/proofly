import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://proofly.edycu.dev"),
  title: "Proofly — TEE-Secured Privacy Verification Agent",
  description: "Prove attributes without revealing PII using selectively disclosed credentials inside attested hardware enclaves.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Proofly — TEE-Secured Privacy Verification Agent",
    description: "Prove attributes without revealing PII using selectively disclosed credentials inside attested hardware enclaves.",
    url: "https://proofly.edycu.dev",
    siteName: "Proofly",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Proofly Privacy Verification Agent",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Proofly — TEE-Secured Privacy Verification Agent",
    description: "Prove attributes without revealing PII using selectively disclosed credentials inside attested hardware enclaves.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className="min-h-full flex flex-col w-full max-w-full overflow-x-hidden">{children}</body>
    </html>
  );
}
