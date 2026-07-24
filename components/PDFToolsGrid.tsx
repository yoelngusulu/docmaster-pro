"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { motion } from "framer-motion";

const pdfTools = [
  "PDF to Word",
  "PDF to Excel",
  "PDF to PowerPoint",
  "PDF to Image",
  "Merge PDF",
  "Split PDF",
  "Compress PDF",
  "Protect PDF",
  "Unlock PDF",
];

export default function PDFToolsGrid() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-4xl font-bold">
          PDF Tools
        </h2>

        <p className="mt-4 text-center text-gray-600">
          Choose the tool you want to use.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pdfTools.map((tool, index) => (
            <motion.div
              key={tool}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.08,
              }}
            >
              <Link
                href={
                  tool === "PDF to Word"
                    ? "/tools/pdf/pdf-to-word"
                    : tool === "PDF to Excel"
                    ? "/tools/pdf/pdf-to-excel"
                    : tool === "PDF to PowerPoint"
                    ? "/tools/pdf/pdf-to-powerpoint"
                    : tool === "PDF to Image"
                    ? "/tools/pdf/pdf-to-image"
                    : tool === "Merge PDF"
                    ? "/tools/pdf/merge-pdf"
                    : tool === "Split PDF"
                    ? "/tools/pdf/split-pdf"
                    : tool === "Compress PDF"
                    ? "/tools/pdf/compress-pdf"
                    : tool === "Protect PDF"
                    ? "/tools/pdf/protect-pdf"
                    : tool === "Unlock PDF"
                    ? "/tools/pdf/unlock-pdf"
                    : "#"
                }
                className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl"
              >
                <FileText
                  size={34}
                  className="text-blue-600 transition-transform group-hover:scale-110"
                />

                <span className="font-semibold text-gray-800">
                  {tool}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}