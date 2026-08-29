import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "DocMaster AI",
  description: "The Smartest Document Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black">
        <Navbar />

        {children}

        <Footer />
      </body>
    </html>
  );
}