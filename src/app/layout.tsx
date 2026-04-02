import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import VerificationBanner from "@/components/VerificationBanner";
import { auth } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 1280,
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rentneighbors.com";

export const metadata: Metadata = {
  title: {
    default: "RentNeighbors - Rent Anything From Your Neighbors",
    template: "%s | RentNeighbors",
  },
  description:
    "The local marketplace for renting tools, gear, electronics, and more from people nearby.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: "website",
    siteName: "RentNeighbors",
    title: "RentNeighbors - Rent Anything From Your Neighbors",
    description:
      "The local marketplace for renting tools, gear, electronics, and more from people nearby.",
    url: BASE_URL,
    images: [{ url: "/logo.svg", width: 512, height: 512, alt: "RentNeighbors" }],
  },
  twitter: {
    card: "summary",
    title: "RentNeighbors - Rent Anything From Your Neighbors",
    description:
      "The local marketplace for renting tools, gear, electronics, and more from people nearby.",
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const emailVerifiedAt = (session?.user as Record<string, unknown> | undefined)?.emailVerifiedAt;
  const showVerificationBanner = !!session?.user && !emailVerifiedAt;

  return (
    <html lang="en" className={`${geistSans.variable} antialiased`}>
      <body className="bg-gray-50 font-[family-name:var(--font-geist-sans)]">
        <Navbar />
        {showVerificationBanner && <VerificationBanner />}
        <main>{children}</main>
        <footer className="border-t border-gray-200 bg-white py-8 px-6">
          <div className="mx-auto max-w-7xl flex items-center justify-end gap-4">
            <div className="flex items-center gap-4">
              <Link href="/faq" className="text-xs text-gray-400 hover:text-gray-600">
                FAQ
              </Link>
              <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600">
                Terms &amp; Privacy
              </Link>
              <p className="text-xs text-gray-400 whitespace-nowrap">
                RentNeighbors &copy; {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
