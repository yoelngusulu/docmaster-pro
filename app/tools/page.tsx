import ToolCategories from "@/components/ToolCategories";

export const metadata = {
  title: "Tools | DocMaster AI",
  description:
    "Choose DocMaster AI tools for PDF, image and GIS coordinate conversion.",
};

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-white">
      <ToolCategories />
    </main>
  );
}