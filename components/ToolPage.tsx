import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import UploadArea from "./UploadArea";
import { toolConfig } from "./toolConfig";

type ToolPageProps = {
  tool: keyof typeof toolConfig;
  backLink: string;
  backText: string;
};

export default function ToolPage({
  tool,
  backLink,
  backText,
}: ToolPageProps) {
  const config = toolConfig[tool];

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
                    Upload, process and download from one clean workspace.
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
                    Supports {config.accept.toUpperCase()} files up to 100 MB.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <UploadArea tool={tool} />
        </section>
      </div>
    </main>
  );
}
