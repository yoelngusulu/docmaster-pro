import type { ReactNode } from "react";

import CoordinateExportEnhancer from "./CoordinateExportEnhancer";

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
