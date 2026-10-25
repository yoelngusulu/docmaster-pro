import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Coordinate Distance, Area & Bearing Calculator",
  description:
    "Calculate distance and area from decimal, DMS or UTM coordinates online. Paste points or upload a CSV file with YAJU.",
  alternates: { canonical: "/tools/gis/distance-area-calculator" },
};

export default function DistanceAreaLayout({ children }: { children: ReactNode }) {
  return children;
}
