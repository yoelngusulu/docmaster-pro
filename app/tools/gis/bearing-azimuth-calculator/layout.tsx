import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Bearing and Azimuth Calculator",
  description:
    "Calculate bearing, azimuth and distance between coordinates online using decimal, DMS or UTM input with YAJU.",
  alternates: { canonical: "/tools/gis/bearing-azimuth-calculator" },
};

export default function BearingAzimuthLayout({ children }: { children: ReactNode }) {
  return children;
}
