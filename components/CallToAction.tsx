"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CallToAction() {
  const openAIAssistant = () => {
    window.dispatchEvent(
      new CustomEvent("open-docmaster-ai")
    );
  };

  return (
    <section className="bg-blue-600 py-20">
      <div className="mx-auto max-w-5xl px-6 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Sparkles
            className="mx-auto mb-6"
            size={48}
          />

          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to Transform Your Documents?
          </h2>

          <p className="mt-6 text-lg text-blue-100">
            Convert PDFs, Office files and images in seconds
            with DocMaster.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="#tools"
              className="rounded-xl bg-white px-7 py-3 font-semibold text-blue-600 transition hover:bg-gray-100"
            >
              Browse Tools
            </Link>

            <button
              type="button"
              onClick={openAIAssistant}
              className="flex items-center gap-2 rounded-xl border border-white px-7 py-3 font-semibold transition hover:bg-white hover:text-blue-600"
            >
              Ask DocMaster AI
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}