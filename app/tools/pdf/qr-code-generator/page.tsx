import type { Metadata } from "next";
import QRCodeGenerator from "@/components/QRCodeGenerator";

export const metadata: Metadata = {
  title: "Free QR Code Generator | YAJU Documents",
  description: "Create and download custom QR codes for websites, text, email addresses, phone numbers and Wi-Fi networks.",
  alternates: { canonical: "/tools/pdf/qr-code-generator" },
};

export default function QRCodeGeneratorPage() {
  return <QRCodeGenerator />;
}
