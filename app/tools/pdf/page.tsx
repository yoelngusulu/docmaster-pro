import {
  Archive,
  FileImage,
  FileText,
  Lock,
  Merge,
  Presentation,
  Scissors,
  Table2,
  UnlockKeyhole,
} from "lucide-react";

import ToolHubPage from "@/components/ToolHubPage";

const pdfTools = [
  {
    title: "PDF to Word",
    description: "Convert PDF documents into editable Word files.",
    href: "/tools/pdf/pdf-to-word",
    icon: FileText,
    badge: "Convert",
  },
  {
    title: "PDF to Excel",
    description: "Extract tables from PDF files into editable spreadsheets.",
    href: "/tools/pdf/pdf-to-excel",
    icon: Table2,
    badge: "Convert",
  },
  {
    title: "PDF to PowerPoint",
    description: "Turn PDF pages into editable presentation slides.",
    href: "/tools/pdf/pdf-to-powerpoint",
    icon: Presentation,
    badge: "Convert",
  },
  {
    title: "PDF to Image",
    description: "Export PDF pages as downloadable image files.",
    href: "/tools/pdf/pdf-to-image",
    icon: FileImage,
    badge: "Convert",
  },
  {
    title: "Merge PDF",
    description: "Combine multiple PDF files into a single document.",
    href: "/tools/pdf/merge-pdf",
    icon: Merge,
    badge: "Organize",
  },
  {
    title: "Split PDF",
    description: "Divide one PDF into separate page files.",
    href: "/tools/pdf/split-pdf",
    icon: Scissors,
    badge: "Organize",
  },
  {
    title: "Compress PDF",
    description: "Reduce PDF file size for easier sharing.",
    href: "/tools/pdf/compress-pdf",
    icon: Archive,
    badge: "Optimize",
  },
  {
    title: "Protect PDF",
    description: "Add password protection to sensitive PDF files.",
    href: "/tools/pdf/protect-pdf",
    icon: Lock,
    badge: "Security",
  },
  {
    title: "Unlock PDF",
    description: "Remove password protection from PDF files you can access.",
    href: "/tools/pdf/unlock-pdf",
    icon: UnlockKeyhole,
    badge: "Security",
  },
];

export default function PDFToolsPage() {
  return (
    <ToolHubPage
      eyebrow="PDF Tools"
      title="PDF Tools"
      subtitle="Convert, compress, merge, split, protect and unlock PDF documents from one consistent workspace."
      tools={pdfTools}
    />
  );
}
