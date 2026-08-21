import {
  Bot,
  Eraser,
  FileSearch,
  FileText,
  Image,
  Languages,
  PenLine,
  ScanText,
  Sparkles,
  UserRound,
  Wand2,
  ZoomIn,
} from "lucide-react";

import ToolHubPage from "@/components/ToolHubPage";

const aiTools = [
  {
    title: "AI Image Editor",
    description: "Apply guided edits, enhancements and creative adjustments.",
    href: "/tools/ai/image-editor",
    icon: Wand2,
    badge: "Image",
  },
  {
    title: "Background Remover",
    description: "Remove image backgrounds for product or profile assets.",
    href: "/tools/ai/background-remover",
    icon: Eraser,
    badge: "Image",
  },
  {
    title: "Photo Enhancer",
    description: "Improve clarity, lighting and detail in uploaded photos.",
    href: "/tools/ai/photo-enhancer",
    icon: Sparkles,
    badge: "Image",
  },
  {
    title: "Object Remover",
    description: "Prepare an image for object cleanup.",
    href: "/tools/ai/object-remover",
    icon: Image,
    badge: "Image",
  },
  {
    title: "Face Retouch",
    description: "Retouch portraits while keeping a natural-looking result.",
    href: "/tools/ai/face-retouch",
    icon: UserRound,
    badge: "Image",
  },
  {
    title: "Image Upscaler",
    description: "Prepare images for higher-resolution output.",
    href: "/tools/ai/image-upscaler",
    icon: ZoomIn,
    badge: "Image",
  },
  {
    title: "Image Colorizer",
    description: "Add color to black-and-white images.",
    href: "/tools/ai/image-colorizer",
    icon: PenLine,
    badge: "Image",
  },
  {
    title: "Image to Text (OCR)",
    description: "Extract text from screenshots, scans and photos.",
    href: "/tools/ai/image-to-text",
    icon: ScanText,
    badge: "OCR",
  },
  {
    title: "Summarize PDF",
    description: "Upload a PDF and prepare it for AI summarization.",
    href: "/tools/ai/summarize-pdf",
    icon: FileSearch,
    badge: "Document",
  },
  {
    title: "Chat with PDF",
    description: "Upload a document and ask questions about its content.",
    href: "/tools/ai/chat-with-pdf",
    icon: Bot,
    badge: "Document",
  },
  {
    title: "Translate Document",
    description: "Upload a document and prepare it for translation.",
    href: "/tools/ai/translate-document",
    icon: Languages,
    badge: "Document",
  },
  {
    title: "Resume Builder",
    description: "Upload an existing resume or start from a document draft.",
    href: "/tools/ai/resume-builder",
    icon: FileText,
    badge: "Document",
  },
];

export default function AIToolsPage() {
  return (
    <ToolHubPage
      eyebrow="AI Tools"
      title="AI Tools"
      subtitle="Edit, enhance, extract and prepare documents with the same tool navigation pattern used across DocMaster."
      tools={aiTools}
    />
  );
}
