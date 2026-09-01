"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { motion } from "framer-motion";

const pdfTools = [
  {
    title: "Merge PDF",
    href: "/tools/pdf/merge-pdf",
    status: "Live",
  },
  {
    title: "Split PDF",
    href: "/tools/pdf/split-pdf",
    status: "Live",
  },
  {
    title: "Compress PDF",
    href: "/tools/pdf/compress-pdf",
    status: "Live",
  },
  {
    title: "PDF to Word",
    href: "/tools/pdf/pdf-to-word",
    status: "Server soon",
  },
  {
    title: "PDF to Excel",
    href: "/tools/pdf/pdf-to-excel",
    status: "Server soon",
  },
  {
    title: "PDF to PowerPoint",
    href: "/tools/pdf/pdf-to-powerpoint",
    status: "Server soon",
  },
  {
    title: "PDF to Image",
    href: "/tools/pdf/pdf-to-image",
    status: "Server soon",
  },
  {
    title: "Protect PDF",
    href: "/tools/pdf/protect-pdf",
    status: "Server soon",
  },
  {
    title: "Unlock PDF",
    href: "/tools/pdf/unlock-pdf",
    status: "Server soon",
  },
];

export default function PDFToolsGrid() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-4xl font-bold">
          PDF Tools
        </h2>

        <p className="mt-4 text-center text-gray-600">
          Choose a live tool now, or view the status of server-based converters.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pdfTools.map((tool, index) => {
            const isLive = tool.status === "Live";

            return (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.08,
                }}
              >
                <Link
                  href={tool.href}
                  className={`group flex items-center justify-between gap-4 rounded-2xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${
                    isLive
                      ? "border-gray-200 hover:border-blue-500"
                      : "border-amber-100 hover:border-amber-400"
                  }`}
                >
                  <span className="flex items-center gap-4">
                    <FileText
                      size={34}
                      className={`transition-transform group-hover:scale-110 ${
                        isLive
                          ? "text-blue-600"
                          : "text-amber-700"
                      }`}
                    />

                    <span className="font-semibold text-gray-800">
                      {tool.title}
                    </span>
                  </span>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      isLive
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {tool.status}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
