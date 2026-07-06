"use client";

import { motion } from "framer-motion";
import {
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Bot,
} from "lucide-react";

const categories = [
  {
    icon: FileText,
    title: "PDF Tools",
    tools: "12 Available Tools",
    description:
      "Convert, merge, split, compress and protect PDF documents.",
  },
  {
    icon: FileSpreadsheet,
    title: "Office Tools",
    tools: "6 Available Tools",
    description:
      "Convert Word, Excel and PowerPoint documents.",
  },
  {
    icon: ImageIcon,
    title: "Image Tools",
    tools: "8 Available Tools",
    description:
      "Convert images to PDF and optimize image files.",
  },
  {
    icon: Bot,
    title: "AI Tools",
    tools: "Coming Soon",
    description:
      "OCR, PDF Chat, Translation and AI Summary.",
  },
];

export default function ToolCategories() {
  return (
    <section className="bg-gradient-to-b from-white to-blue-50 py-20">
      <div className="mx-auto max-w-7xl px-6">

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center text-4xl font-bold text-gray-900"
        >
          Choose Your Tool
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-4 text-center text-gray-600"
        >
          Everything you need to manage documents in one platform.
        </motion.p>

        <div className="mt-12 grid gap-8 md:grid-cols-2">

          {categories.map((category, index) => {
            const Icon = category.icon;

            return (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.15,
                }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group rounded-3xl border border-gray-200 bg-white p-8 shadow-md transition-all duration-300 hover:border-blue-500 hover:shadow-2xl"
              >
                <Icon
                  size={56}
                  className="text-blue-600 transition-transform duration-300 group-hover:scale-110"
                />

                <h3 className="mt-6 text-2xl font-bold text-gray-900">
                  {category.title}
                </h3>

                <p className="mt-2 font-semibold text-blue-600">
                  {category.tools}
                </p>

                <p className="mt-4 text-gray-600">
                  {category.description}
                </p>

                <button className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-all duration-300 hover:bg-blue-700 hover:shadow-lg">
                  Explore →
                </button>
              </motion.div>
            );
          })}

        </div>
      </div>
    </section>
  );
}