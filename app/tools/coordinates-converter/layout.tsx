import type { Metadata } from "next";
import type { ReactNode } from "react";

import CoordinateExportEnhancer from "./CoordinateExportEnhancer";

export const metadata: Metadata = {
  title: "Coordinates Converter: DD, DMS and UTM",
  description:
    "Convert coordinates between decimal degrees, DMS and UTM online. Process individual coordinates or upload CSV and Excel files with YAJU.",
  alternates: { canonical: "/tools/coordinates-converter" },
};

export default function CoordinatesConverterLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <CoordinateExportEnhancer />
    </>
  );
}
