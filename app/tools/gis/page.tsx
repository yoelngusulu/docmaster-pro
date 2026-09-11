import { Compass, Droplets, MapPinned, Ruler } from "lucide-react";

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
    title: "Water Storage & Tank Sizing",
    description:
      "Estimate storage for rainwater harvesting, borehole and pumping systems, irrigation demand and physical tank dimensions.",
    href: "/tools/gis/water-storage-calculator",
    icon: Droplets,
    badge: "New",
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
  title: "YAJU Coordinates & Engineering Tools | YAJU",
  description:
    "YAJU tools for coordinate conversion, distance and area measurement, water storage and tank sizing, irrigation storage and bearing calculation.",
};

export default function GISToolsPage() {
  return (
    <ToolHubPage
      eyebrow="YAJU Coordinates & Engineering"
      title="YAJU Coordinates & Engineering Tools"
      subtitle="Convert coordinates, measure locations, size water storage for rainwater, pumping and irrigation systems, and calculate bearings from one clean workspace."
      backLink="/tools"
      backText="Back to Tools"
      tools={gisTools}
    />
  );
}
