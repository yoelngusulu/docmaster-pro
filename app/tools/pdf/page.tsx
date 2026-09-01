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
    title: "Merge PDF",
    description:
      "Combine multiple PDF files into a single document. Live on Vercel.",
    href: "/tools/pdf/merge-pdf",
    icon: Merge,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "Split PDF",
    description:
      "Divide one PDF into selected ranges or smaller parts. Live on Vercel.",
    href: "/tools/pdf/split-pdf",
    icon: Scissors,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "Compress PDF",
    description:
      "Reduce PDF file size for easier sharing. Live on Vercel.",
    href: "/tools/pdf/compress-pdf",
    icon: Archive,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "PDF to Word",
    description:
      "Prepared for the dedicated document conversion server required for reliable Word output.",
    href: "/tools/pdf/pdf-to-word",
    icon: FileText,
    badge: "Server soon",
    status: "server-coming-soon" as const,
  },
  {
    title: "PDF to Excel",
    description:
      "Prepared for the dedicated document conversion server required for reliable table extraction.",
    href: "/tools/pdf/pdf-to-excel",
    icon: Table2,
    badge: "Server soon",
    status: "server-coming-soon" as const,
  },
  {
    title: "PDF to PowerPoint",
    description:
      "Prepared for the dedicated document conversion server required for presentation output.",
    href: "/tools/pdf/pdf-to-powerpoint",
    icon: Presentation,
    badge: "Server soon",
    status: "server-coming-soon" as const,
  },
  {
    title: "PDF to Image",
    description:
      "Prepared for the dedicated rendering server required for high-quality page images.",
    href: "/tools/pdf/pdf-to-image",
    icon: FileImage,
    badge: "Server soon",
    status: "server-coming-soon" as const,
  },
  {
    title: "Protect PDF",
    description:
      "Prepared for the dedicated QPDF server required for password protection.",
    href: "/tools/pdf/protect-pdf",
    icon: Lock,
    badge: "Server soon",
    status: "server-coming-soon" as const,
  },
  {
    title: "Unlock PDF",
    description:
      "Prepared for the dedicated QPDF server required for secure PDF unlocking.",
    href: "/tools/pdf/unlock-pdf",
    icon: UnlockKeyhole,
    badge: "Server soon",
    status: "server-coming-soon" as const,
  },
];

export default function PDFToolsPage() {
  return (
    <ToolHubPage
      eyebrow="PDF Tools"
      title="PDF Tools"
      subtitle="Use the PDF tools that are live on Vercel now, while advanced server-based converters are prepared for the production worker."
      tools={pdfTools}
    />
  );
}
