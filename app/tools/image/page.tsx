import {
  Archive,
  FileImage,
} from "lucide-react";

import ToolHubPage from "@/components/ToolHubPage";

const imageTools = [
  {
    title: "Image to PDF",
    description: "Convert JPG, PNG and other images into one PDF document.",
    href: "/tools/image/image-to-pdf",
    icon: FileImage,
    badge: "Convert",
  },
  {
    title: "Compress Image",
    description: "Reduce image file size while keeping good visual quality.",
    href: "/tools/image/compress-image",
    icon: Archive,
    badge: "Optimize",
  },
];

export default function ImageToolsPage() {
  return (
    <ToolHubPage
      eyebrow="Image Tools"
      title="Image Tools"
      subtitle="Convert images into PDFs or reduce image size through the same simple DocMaster workflow."
      tools={imageTools}
    />
  );
}
