import ToolCategories from "@/components/ToolCategories";

export const metadata = {
  title: "Tools | DocMaster",
  description:
    "Choose DocMaster tools for PDF, image and GIS coordinate conversion.",
};

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-white">
      <ToolCategories />
    </main>
  );
}