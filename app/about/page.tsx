import Link from "next/link";
import {
  Bot,
  FileText,
  Image as ImageIcon,
  Layers3,
  MapPinned,
} from "lucide-react";

const capabilities = [
  {
    title: "PDF & Document Tools",
    description:
      "Convert, compress, merge, split, protect and manage documents through practical workflows designed for everyday productivity.",
    icon: FileText,
  },
  {
    title: "Image Tools",
    description:
      "Convert, compress and enhance images using simple image-processing and AI-assisted tools.",
    icon: ImageIcon,
  },
  {
    title: "GIS & Coordinate Tools",
    description:
      "Convert coordinates, process coordinate datasets in bulk and use practical geospatial utilities designed for GIS, surveying, engineering and mapping workflows.",
    icon: MapPinned,
  },
  {
    title: "AI-Powered Tools",
    description:
      "Use AI-assisted workflows for OCR, document summarization, translation, image enhancement and other productivity tasks.",
    icon: Bot,
  },
];

const reasons = [
  {
    title: "Practical",
    description:
      "Built around real document, image and data workflows.",
  },
  {
    title: "Simple",
    description:
      "Complex processing presented through an easy-to-use interface.",
  },
  {
    title: "Accessible",
    description:
      "Essential tools remain available for free, with advanced capabilities for professional users.",
  },
  {
    title: "Growing Platform",
    description:
      "Continuously expanding with useful document, GIS and AI-powered workflows.",
  },
];

export const metadata = {
  title: "About DocMaster | Yoeln Digital Products",
  description:
    "Learn about DocMaster, a productivity platform for documents, images, GIS and AI-powered workflows.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-14">
      <section className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm md:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              About DocMaster
            </p>

            <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
              One smart workspace for documents, images, GIS and AI-powered productivity.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600">
              DocMaster is a productivity platform developed by {" "}
              <strong className="font-semibold text-gray-900">
                Yoeln Digital Products
              </strong>
              , bringing together powerful PDF tools, image processing,
              GIS utilities and AI-assisted workflows in one simple and
              professional workspace.
            </p>

            <p className="mt-4 max-w-3xl leading-7 text-gray-600">
              Our mission is to simplify everyday digital tasks by
              providing practical tools that help individuals,
              professionals and businesses work with documents, images
              and spatial data faster and more efficiently.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Layers3 size={24} />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-gray-900">
              Built as a practical platform
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              DocMaster brings everyday file, data and AI workflows into
              one organized product experience for people who need useful
              tools without unnecessary complexity.
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {capabilities.map((capability) => {
            const Icon = capability.icon;

            return (
              <article
                key={capability.title}
                className="rounded-xl border border-gray-200 bg-gray-50 p-5 transition hover:border-blue-200 hover:bg-white hover:shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                  <Icon size={21} />
                </div>

                <h2 className="mt-5 text-lg font-bold text-gray-900">
                  {capability.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {capability.description}
                </p>
              </article>
            );
          })}
        </div>

        <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Why DocMaster?
            </p>

            <h2 className="mt-3 text-3xl font-bold text-gray-900">
              Practical tools, simple workflows and room to grow.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {reasons.map((reason) => (
              <div
                key={reason.title}
                className="rounded-xl border border-gray-200 bg-gray-50 p-5"
              >
                <h3 className="font-bold text-gray-900">
                  {reason.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {reason.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl bg-blue-600 p-6 text-white md:p-8">
          <h2 className="max-w-3xl text-3xl font-bold">
            Built for people who work with files and data every day.
          </h2>

          <p className="mt-4 max-w-4xl leading-7 text-blue-50">
            Whether you&apos;re converting a PDF, processing an image,
            transforming coordinate data or using AI to understand a
            document, DocMaster brings practical productivity tools
            together in one workspace.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/tools"
              className="inline-flex justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Explore Tools
            </Link>

            <Link
              href="/pricing"
              className="inline-flex justify-center rounded-lg border border-white/70 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>
        </section>

        <div className="mt-10 border-t border-gray-200 pt-8 text-center">
          <p className="font-semibold text-gray-900">
            DocMaster - Developed by Yoeln Digital Products
          </p>

          <p className="mt-2 text-sm italic text-gray-500">
            Simplifying documents, data and digital workflows.
          </p>
        </div>
      </section>
    </main>
  );
}
