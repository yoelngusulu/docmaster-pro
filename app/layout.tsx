import type { Metadata } from "next";
import Script from "next/script";
import "leaflet/dist/leaflet.css";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const adsenseClient =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-4368066697517385";

export const metadata: Metadata = {
  title: "DocMaster",
  description: "The Smart Document Platform",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  verification: {
    google: "FppDEXu38DNorAFUEUKxvodn18B68YT6hF8uvmpBDuo",
  },
};

const themeScript = `
(function () {
  try {
    var storedTheme = localStorage.getItem("docmaster-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var useDark = storedTheme ? storedTheme === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", useDark);
  } catch (error) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-black dark:bg-slate-950 dark:text-gray-100">
        <Script
          id="google-adsense"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          crossOrigin="anonymous"
        />

        <script dangerouslySetInnerHTML={{ __html: themeScript }} />

        <Navbar />

        {children}

        <Footer />
      </body>
    </html>
  );
}
