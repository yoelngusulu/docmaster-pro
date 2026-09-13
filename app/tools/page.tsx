import ToolCategories from "@/components/ToolCategories";

export const metadata = {
  title: "Tools | YAJU",
  description:
    "Choose YAJU Documents, YAJU Images and YAJU Coordinates tools.",
};

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-white">
      <ToolCategories />
    </main>
  );
}
