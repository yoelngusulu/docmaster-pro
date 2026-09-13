"use client";

import { Printer } from "lucide-react";

export default function PrintGuideButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 print:hidden"
    >
      <Printer size={18} />
      Download / Print PDF
    </button>
  );
}
