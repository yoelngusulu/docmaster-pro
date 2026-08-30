import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "DocMaster AI",
  description: "The Smartest Document Platform",
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />

        <Navbar />

        {children}

        <Footer />
      </body>
    </html>
  );
}
