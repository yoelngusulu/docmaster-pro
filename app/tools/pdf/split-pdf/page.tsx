import type { Metadata } from "next";

import ToolPage from "@/components/ToolPage";

export const metadata: Metadata = {
  title: "Split PDF Online for Free",
  description:
    "Split a PDF into page ranges, selected pages or smaller files online for free with YAJU.",
  alternates: { canonical: "/tools/pdf/split-pdf" },
};

export default function ToolRoutePage() {
  return (
    <ToolPage
      tool="split-pdf"
      backLink="/tools/pdf"
      backText="Back to PDF Tools"
    />
  );
}
