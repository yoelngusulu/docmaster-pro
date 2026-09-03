"use client";

import Link from "next/link";
import {
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { motion } from "framer-motion";

export default function Hero() {
  const openAIAssistant = () => {
    window.dispatchEvent(
      new CustomEvent("open-docmaster-ai")
    );
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-100 py-20 sm:py-24">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />

      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        {/* Left side */}
        <motion.div
          initial={{
            opacity: 0,
            x: -40,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.7,
          }}
          className="text-center lg:text-left"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            <Sparkles size={18} />

            Smart Document Tools
          </div>

         
          <h1 className="mt-4 text-4xl font-bold text-blue-600 sm:text-3xl md:text-5xl">
            The Smartest Document Platform
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-gray-600 sm:text-lg lg:mx-0">
            Convert, edit and enhance PDF, Office
            documents, images and coordinates with fast,
            secure tools built for professionals.
          </p>

          {/* Buttons */}
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row sm:flex-wrap lg:justify-start">
            <Link
              href="#tools"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"
            >
              <UploadCloud size={20} />

              Upload File
            </Link>

            <button
              type="button"
              onClick={openAIAssistant}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-600 bg-white px-8 py-4 font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              <Sparkles size={20} />

              Ask DocMaster AI
            </button>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <h3 className="text-3xl font-bold text-blue-600">
                20+
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                Tools
              </p>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-blue-600">
                Smart
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                Workflow
              </p>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-blue-600">
                100%
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                Secure
              </p>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-blue-600">
                Fast
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                Processing
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right side */}
        <motion.div
          initial={{
            opacity: 0,
            x: 40,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.8,
          }}
          className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                DocMaster
              </p>

              <h3 className="mt-1 text-2xl font-bold text-gray-900">
                Popular Conversions
              </h3>
            </div>

            <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
              <Sparkles size={24} />
            </div>
          </div>

          <div className="space-y-4">
            <Link
              href="/tools/pdf/pdf-to-word"
              className="flex items-center justify-between rounded-xl bg-blue-50 p-4 transition hover:bg-blue-100"
            >
              <span className="font-medium text-gray-800">
                📄 PDF → Word
              </span>

              <span className="font-semibold text-green-600">
                ✓ Ready
              </span>
            </Link>

            <Link
              href="/tools/coordinates-converter"
              className="flex items-center justify-between rounded-xl bg-blue-50 p-4 transition hover:bg-blue-100"
            >
              <span className="font-medium text-gray-800">
                📍 Coordinate Conversion
              </span>

              <span className="font-semibold text-green-600">
                ✓ Ready
              </span>
            </Link>

            <Link
              href="/tools/image/image-to-pdf"
              className="flex items-center justify-between rounded-xl bg-blue-50 p-4 transition hover:bg-blue-100"
            >
              <span className="font-medium text-gray-800">
                🖼️ JPG → PNG
              </span>

              <span className="font-semibold text-green-600">
                ✓ Ready
              </span>
            </Link>

            <Link
              href="/tools/ai/background-remover"
              className="flex items-center justify-between rounded-xl bg-purple-50 p-4 transition hover:bg-purple-100"
            >
              <span className="font-medium text-gray-800">
                ✨ Remove Background
              </span>

              <span className="font-semibold text-purple-600">
                AI
              </span>
            </Link>

            <Link
              href="/tools/ai/image-editor"
              className="flex items-center justify-between rounded-xl bg-purple-50 p-4 transition hover:bg-purple-100"
            >
              <span className="font-medium text-gray-800">
                🤖 AI Image Editor
              </span>

              <span className="font-semibold text-purple-600">
                AI
              </span>
            </Link>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-3 text-center text-sm text-gray-600">
            Fast, secure and easy document processing.
          </div>
        </motion.div>
      </div>
    </section>
  );
}