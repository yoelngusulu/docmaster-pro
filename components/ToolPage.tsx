import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ServerCog,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import GoogleAd from "./GoogleAd";
import MergePdfUploadArea from "./MergePdfUploadArea";
import SplitPdfUploadArea from "./SplitPdfUploadArea";
import UploadArea from "./UploadArea";
import { toolConfig } from "./toolConfig";

type ToolPageProps = {
  tool: keyof typeof toolConfig;
  backLink: string;
  backText: string;
};

const liveVercelTools = [
  {
    href: "/tools/pdf/merge-pdf",
    label: "Merge PDF",
  },
  {
    href: "/tools/pdf/split-pdf",
    label: "Split PDF",
  },
  {
    href: "/tools/pdf/compress-pdf",
    label: "Compress PDF",
  },
  {
    href: "/tools/image/image-to-pdf",
    label: "Image to PDF",
  },
  {
    href: "/tools/coordinates-converter",
    label: "Coordinates",
  },
];

export default function ToolPage({
  tool,
  backLink,
  backText,
}: ToolPageProps) {
  const config = toolConfig[tool];
  const isServerComingSoon =
    "availability" in config &&
    config.availability === "server-coming-soon";
  const availabilityTitle =
    "availabilityTitle" in config
      ? config.availabilityTitle
      : "Server processing coming soon";
  const availabilityMessage =
    "availabilityMessage" in config
      ? config.availabilityMessage
      : "This converter needs a dedicated conversion server before it can run in production.";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <Link
          href={backLink}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
        >
          <ArrowLeft size={16} />
          {backText}
        </Link>

        <GoogleAd
          slot={process.env.NEXT_PUBLIC_ADSENSE_TOOL_TOP_SLOT}
          className="mt-8"
        />

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase text-blue-700">
              <Sparkles size={14} />
              DocMaster Tool
            </p>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
              {config.title}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
              {config.subtitle}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-green-600"
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    Guided flow
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    {isServerComingSoon
                      ? "This tool is being prepared for production processing."
                      : "Upload, process and download from one clean workspace."}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <ShieldCheck
                  size={20}
                  className="mt-0.5 shrink-0 text-blue-600"
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    File limits
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    {config.accept
                      ? `Supports ${config.accept.toUpperCase()} files up to 100 MB.`
                      : "Use the on-page converter controls."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {isServerComingSoon ? (
            <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <ServerCog size={24} />
              </div>

              <p className="mt-5 text-sm font-bold uppercase tracking-wide text-amber-700">
                Production status
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-950">
                {availabilityTitle}
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
                {availabilityMessage}
              </p>

              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">
                  Available now on Vercel
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {liveVercelTools.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-blue-50"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : tool === "merge-pdf" ? (
            <MergePdfUploadArea />
          ) : tool === "split-pdf" ? (
            <SplitPdfUploadArea />
          ) : (
            <UploadArea tool={tool} />
          )}
        </section>

        <GoogleAd
          slot={process.env.NEXT_PUBLIC_ADSENSE_TOOL_BOTTOM_SLOT}
          className="mt-10"
        />
      </div>
    </main>
  );
}