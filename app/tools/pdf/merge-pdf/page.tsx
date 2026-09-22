import type { Metadata } from "next";

import ToolPage from "@/components/ToolPage";

export const metadata: Metadata = {
  title: "Merge PDF Online for Free",
  description:
    "Combine multiple PDF files into one document online for free with YAJU. Arrange your files, merge them and download one PDF.",
  alternates: { canonical: "/tools/pdf/merge-pdf" },
};

export default function ToolRoutePage() {
  return (
    <ToolPage
      tool="merge-pdf"
      backLink="/tools/pdf"
      backText="Back to PDF Tools"
    />
  );
}
