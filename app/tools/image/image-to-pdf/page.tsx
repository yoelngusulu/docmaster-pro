import type { Metadata } from "next";

import ToolPage from "@/components/ToolPage";

export const metadata: Metadata = {
  title: "Image to PDF Converter Online",
  description:
    "Convert JPG and PNG images to one PDF online for free. Arrange your images and download a single PDF with YAJU.",
  alternates: { canonical: "/tools/image/image-to-pdf" },
};

export default function ImageToPdfPage() {
  return (
    <ToolPage
      tool="image-to-pdf"
      backLink="/tools/image"
      backText="Back to Image Tools"
    />
  );
}
