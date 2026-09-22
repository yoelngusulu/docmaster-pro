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

type ToolSeo = {
  intro: string;
  steps: string[];
  faqs: { question: string; answer: string }[];
  related: { href: string; label: string }[];
};

const toolSeoContent: Partial<Record<keyof typeof toolConfig, ToolSeo>> = {
  "merge-pdf": {
    intro:
      "Use this free online PDF merger to combine several PDF files into one ordered document. It is useful for reports, applications, invoices and scanned pages that need to be shared as a single file.",
    steps: [
      "Add the PDF files you want to combine.",
      "Arrange the files in the order you need.",
      "Merge and download the combined PDF.",
    ],
    faqs: [
      { question: "How many PDF files can I merge?", answer: "You can add multiple PDF files, subject to the displayed upload and file-size limits." },
      { question: "Can I change the file order?", answer: "Yes. Arrange the uploaded files before starting the merge." },
    ],
    related: [
      { href: "/tools/pdf/split-pdf", label: "Split PDF" },
      { href: "/tools/pdf/compress-pdf", label: "Compress PDF" },
      { href: "/tools/image/image-to-pdf", label: "Image to PDF" },
    ],
  },
  "split-pdf": {
    intro:
      "Split a PDF online when you only need selected pages or want to turn a large document into smaller files. Choose page ranges, custom groups, equal parts or a fixed number of pages per file.",
    steps: [
      "Upload the PDF you want to divide.",
      "Choose page ranges or a splitting method.",
      "Split the document and download the result.",
    ],
    faqs: [
      { question: "Can I extract only certain PDF pages?", answer: "Yes. Use a custom page range to select the pages you need." },
      { question: "Can I split a PDF into equal parts?", answer: "Yes. Select the equal-parts option and choose how many output files you need." },
    ],
    related: [
      { href: "/tools/pdf/merge-pdf", label: "Merge PDF" },
      { href: "/tools/pdf/compress-pdf", label: "Compress PDF" },
      { href: "/tools/image/image-to-pdf", label: "Image to PDF" },
    ],
  },
  "compress-pdf": {
    intro:
      "Compress a PDF online to make it easier to email, upload and store. YAJU reduces the file size while keeping the document usable for everyday sharing.",
    steps: [
      "Upload the PDF you want to reduce.",
      "Start the compression process.",
      "Download the smaller PDF file.",
    ],
    faqs: [
      { question: "Why should I compress a PDF?", answer: "A smaller PDF is faster to upload, download, email and store." },
      { question: "Will compression change the page order?", answer: "No. Compression reduces file size without rearranging document pages." },
    ],
    related: [
      { href: "/tools/pdf/merge-pdf", label: "Merge PDF" },
      { href: "/tools/pdf/split-pdf", label: "Split PDF" },
      { href: "/tools/image/image-to-pdf", label: "Image to PDF" },
    ],
  },
  "image-to-pdf": {
    intro:
      "Convert JPG and PNG images to one PDF online. Add several images, arrange them in the right order and create a single PDF for forms, receipts, notes or scanned documents.",
    steps: [
      "Add one or more JPG or PNG images.",
      "Arrange the images in your preferred page order.",
      "Convert and download the finished PDF.",
    ],
    faqs: [
      { question: "Can I combine several images into one PDF?", answer: "Yes. Upload multiple supported images and arrange them before conversion." },
      { question: "Which image formats are supported?", answer: "The converter accepts the formats listed in the upload area, including common JPG and PNG files." },
    ],
    related: [
      { href: "/tools/pdf/merge-pdf", label: "Merge PDF" },
      { href: "/tools/pdf/split-pdf", label: "Split PDF" },
      { href: "/tools/pdf/compress-pdf", label: "Compress PDF" },
    ],
  },
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
  const seo = toolSeoContent[tool];
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
              YAJU Tool
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

        {seo ? (
          <section className="mx-auto mt-12 max-w-4xl border-t border-gray-200 pt-10 text-gray-700">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: seo.faqs.map((item) => ({
                    "@type": "Question",
                    name: item.question,
                    acceptedAnswer: { "@type": "Answer", text: item.answer },
                  })),
                }),
              }}
            />
            <h2 className="text-2xl font-bold text-gray-950">
              How to use {config.title}
            </h2>
            <p className="mt-4 leading-7">{seo.intro}</p>
            <ol className="mt-5 list-decimal space-y-2 pl-5 leading-7">
              {seo.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>

            <h2 className="mt-10 text-2xl font-bold text-gray-950">
              Frequently asked questions
            </h2>
            <div className="mt-5 divide-y divide-gray-200 border-y border-gray-200">
              {seo.faqs.map((item) => (
                <div key={item.question} className="py-5">
                  <h3 className="font-semibold text-gray-950">{item.question}</h3>
                  <p className="mt-2 leading-7">{item.answer}</p>
                </div>
              ))}
            </div>

            <h2 className="mt-10 text-xl font-bold text-gray-950">Related tools</h2>
            <nav aria-label="Related tools" className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              {seo.related.map((item) => (
                <Link key={item.href} href={item.href} className="font-semibold text-blue-600 hover:text-blue-700">
                  {item.label}
                </Link>
              ))}
            </nav>
          </section>
        ) : null}
      </div>
    </main>
  );
}
