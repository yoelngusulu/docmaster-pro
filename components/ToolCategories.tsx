"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  Image as ImageIcon,
  MapPinned,
} from "lucide-react";
const categories = [
  {
    icon: FileText,
    title: "PDF Tools",
    href: "/tools/pdf",
    tools: "9 Available Tools",
    description:
      "Convert, merge, split, compress and protect PDF documents.",
  },

    {
    icon: MapPinned,
    title: "GIS Tools",
    href: "/tools/coordinates-converter",
    tools: "1 Available Tool",
    description:
      "Convert latitude and longitude between decimal degrees and DMS format.",
  },
  {
    icon: ImageIcon,
    title: "Image Tools",
    href: "/tools/image",
    tools: "2 Available Tools",
    description:
      "Convert, compress, edit and optimize image files.",
  },
];

export default function ToolCategories() {
  return (
    <section
      id="tools"
      className="scroll-mt-24 bg-gradient-to-b from-white to-blue-50 py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
          }}
          viewport={{
            once: true,
            amount: 0.3,
          }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            DocMaster AI Tools
          </p>

          <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
            Choose Your Tool
          </h2>

          <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
            Everything you need to convert, edit and manage
            documents in one intelligent platform.
          </p>
        </motion.div>

       <div className="mx-auto mt-12 grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => {
            const Icon = category.icon;

            return (
              <motion.article
                key={category.title}
                initial={{
                  opacity: 0,
                  y: 40,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.15,
                }}
                viewport={{
                  once: true,
                  amount: 0.2,
                }}
                whileHover={{
                  y: -8,
                }}
                className="group flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-8 shadow-md transition-all duration-300 hover:border-blue-400 hover:shadow-2xl"
              >
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 transition duration-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
                  <Icon size={34} />
                </div>

                <h3 className="mt-6 text-2xl font-bold text-gray-900">
                  {category.title}
                </h3>

                <p className="mt-2 font-semibold text-blue-600">
                  {category.tools}
                </p>

                <p className="mt-4 flex-1 leading-7 text-gray-600">
                  {category.description}
                </p>

                <Link
                  href={category.href}
                  className="mt-8 inline-flex w-fit items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Explore
                  <span
                    aria-hidden="true"
                    className="ml-2 transition-transform duration-300 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
