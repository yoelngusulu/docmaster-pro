import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Water Storage and Tank Size Calculator",
  description:
    "Estimate rainwater, borehole and irrigation storage needs or calculate tank capacity online with YAJU.",
  alternates: { canonical: "/tools/gis/water-storage-calculator" },
};

export default function WaterStorageLayout({ children }: { children: ReactNode }) {
  return children;
}
