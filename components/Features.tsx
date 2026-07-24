"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Cloud,
  LockKeyhole,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Convert and process your documents quickly without unnecessary delays.",
  },
  {
    icon: LockKeyhole,
    title: "Secure Processing",
    description:
      "Your files are processed securely and protected throughout the workflow.",
  },
  {
    icon: Bot,
    title: "AI Powered",
    description:
      "Use intelligent tools to edit images and simplify document workflows.",
  },
  {
    icon: Cloud,
    title: "Cloud Based",
    description:
      "Access DocMaster AI directly from your browser without installing software.",
  },
];

export default function Features() {
  return (
    <section className="bg-white py-20">
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
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Why Choose DocMaster AI
          </p>

          <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
            Everything You Need to Work Smarter
          </h2>

          <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
            A fast, secure and intelligent platform for managing
            documents and images in one place.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.article
                key={feature.title}
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
                  delay: index * 0.12,
                }}
                viewport={{
                  once: true,
                  amount: 0.2,
                }}
                whileHover={{
                  y: -7,
                }}
                className="group rounded-3xl border border-gray-200 bg-white p-7 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-xl"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
                  <Icon size={28} />
                </div>

                <h3 className="mt-6 text-xl font-bold text-gray-900">
                  {feature.title}
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  {feature.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}