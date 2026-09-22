import type { Metadata } from "next";

import ToolPage from "@/components/ToolPage";

export const metadata: Metadata = {
  title: "Compress PDF Online for Free",
  description:
    "Reduce PDF file size online for easier sharing and storage. Compress a PDF for free with YAJU.",
  alternates: { canonical: "/tools/pdf/compress-pdf" },
};

export default function ToolRoutePage() {
  return (
    <ToolPage
      tool="compress-pdf"
      backLink="/tools/pdf"
      backText="Back to PDF Tools"
    />
  );
}
