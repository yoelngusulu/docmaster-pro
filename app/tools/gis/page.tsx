import { MapPinned, Ruler } from "lucide-react";

import ToolHubPage from "@/components/ToolHubPage";

const gisTools = [
  {
    title: "Coordinates Converter",
    description:
      "Convert coordinates between Decimal Degrees, DMS and UTM with bulk CSV/Excel support and map preview.",
    href: "/tools/coordinates-converter",
    icon: MapPinned,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "Distance & Area Calculator",
    description:
      "Measure distance, perimeter and approximate area from latitude and longitude coordinate pairs.",
    href: "/tools/gis/distance-area-calculator",
    icon: Ruler,
    badge: "Live",
    status: "available" as const,
  },
];

export const metadata = {
  title: "GIS Tools | DocMaster AI",
  description:
    "DocMaster AI GIS tools for coordinate conversion, distance measurement and area calculation.",
};

export default function GISToolsPage() {
  return (
    <ToolHubPage
      eyebrow="GIS Tools"
      title="GIS Tools"
      subtitle="Convert coordinates, check locations on a map and measure simple GIS distances or areas from one clean workspace."
      backLink="/tools"
      backText="Back to Tools"
      tools={gisTools}
    />
  );
}
