import { Compass, MapPinned, Ruler } from "lucide-react";

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
      "Measure distance, perimeter and approximate area from Decimal, DMS, UTM or CSV coordinate points.",
    href: "/tools/gis/distance-area-calculator",
    icon: Ruler,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "Bearing / Azimuth Calculator",
    description:
      "Calculate initial bearing, final bearing, reverse bearing and distance from Decimal, DMS, UTM or CSV coordinate points.",
    href: "/tools/gis/bearing-azimuth-calculator",
    icon: Compass,
    badge: "Live",
    status: "available" as const,
  },
];

export const metadata = {
  title: "GIS Tools | DocMaster",
  description:
    "DocMaster GIS tools for coordinate conversion, distance measurement, area calculation and bearing calculation.",
};

export default function GISToolsPage() {
  return (
    <ToolHubPage
      eyebrow="GIS Tools"
      title="GIS Tools"
      subtitle="Convert coordinates, check locations on a map, measure GIS distances and calculate bearings from one clean workspace."
      backLink="/tools"
      backText="Back to Tools"
      tools={gisTools}
    />
  );
}
