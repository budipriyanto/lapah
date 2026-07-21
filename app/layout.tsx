import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SearchProvider } from "@/contexts/SearchContext";
import { AuthProvider } from "@/contexts/AuthContext";
import QueryProvider from "@/components/QueryProvider";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://lapah.vercel.app"),
  title: "Destinasi Wisata & Kuliner Lampung Timur",
  description:
    "Jelajahi destinasi wisata dan kuliner terbaik di Lampung Timur. Temukan rekomendasi tempat, ulasan, dan informasi lengkap.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.ico",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lapah",
  },
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://file.lampungtimurkab.go.id" />
        <link rel="dns-prefetch" href="https://file.lampungtimurkab.go.id" />
      </head>
      <body className="min-h-full flex flex-col pb-[calc(20px+env(safe-area-inset-bottom))]">
        <SearchProvider>
          <AuthProvider>
            <QueryProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <BottomNav />
              <ScrollToTop />
              <ServiceWorkerRegister />
            </QueryProvider>
          </AuthProvider>
        </SearchProvider>
      </body>
    </html>
  );
}
