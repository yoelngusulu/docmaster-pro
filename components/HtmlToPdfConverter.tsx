"use client";

import Link from "next/link";
import {
  ArrowLeft,
  FileCode2,
  Printer,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { useMemo, useRef, useState } from "react";

type PageSize = "A4" | "Letter";
type Orientation = "portrait" | "landscape";

const MAX_HTML_BYTES = 15 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function prepareHtml(
  source: string,
  pageSize: PageSize,
  orientation: Orientation
) {
  const parser = new DOMParser();
  const document = parser.parseFromString(source, "text/html");

  document
    .querySelectorAll("script, object, embed, iframe, base")
    .forEach((element) => element.remove());

  document
    .querySelectorAll('meta[http-equiv="refresh"]')
    .forEach((element) => element.remove());

  document.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (
        name.startsWith("on") ||
        ((name === "href" || name === "src") &&
          value.startsWith("javascript:"))
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  const printStyle = document.createElement("style");
  printStyle.setAttribute("data-yaju-print-style", "true");
  printStyle.textContent = `
    @page {
      size: ${pageSize} ${orientation};
      margin: 12mm;
    }

    html,
    body {
      background: white;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    img,
    svg,
    canvas {
      max-width: 100%;
      height: auto;
    }

    table {
      break-inside: auto;
    }

    tr,
    img,
    figure {
      break-inside: avoid;
    }

    thead {
      display: table-header-group;
    }

    @media screen {
      body {
        margin: 0;
        padding: 18px;
      }
    }
  `;

  document.head.appendChild(printStyle);

  return `<!doctype html>${document.documentElement.outerHTML}`;
}

function countRelativeAssets(source: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(source, "text/html");
  let count = 0;

  document.querySelectorAll("[src], link[href]").forEach((element) => {
    const value =
      element.getAttribute("src") || element.getAttribute("href") || "";
    const normalized = value.trim().toLowerCase();

    if (
      normalized &&
      !normalized.startsWith("data:") &&
      !normalized.startsWith("http://") &&
      !normalized.startsWith("https://") &&
      !normalized.startsWith("#")
    ) {
      count += 1;
    }
  });

  return count;
}

export default function HtmlToPdfConverter() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [sourceHtml, setSourceHtml] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [orientation, setOrientation] =
    useState<Orientation>("portrait");
  const [error, setError] = useState<string | null>(null);

  const previewHtml = useMemo(
    () =>
      sourceHtml
        ? prepareHtml(sourceHtml, pageSize, orientation)
        : "",
    [orientation, pageSize, sourceHtml]
  );

  const relativeAssetCount = useMemo(
    () => (sourceHtml ? countRelativeAssets(sourceHtml) : 0),
    [sourceHtml]
  );

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError(null);

    if (!file) {
      return;
    }

    if (!/\.html?$/i.test(file.name)) {
      setError("Choose an HTML or HTM file.");
      return;
    }

    if (file.size > MAX_HTML_BYTES) {
      setError("The HTML file must be 15 MB or smaller.");
      return;
    }

    try {
      const text = await file.text();

      if (!/<html|<!doctype|<body|<table|<div/i.test(text)) {
        setError("This file does not appear to contain an HTML report.");
        return;
      }

      setFileName(file.name);
      setFileSize(file.size);
      setSourceHtml(text);
    } catch {
      setError("YAJU could not read this HTML file.");
    }
  }

  function clearFile() {
    setFileName(null);
    setFileSize(0);
    setSourceHtml("");
    setError(null);
  }

  function printPdf() {
    const previewWindow = iframeRef.current?.contentWindow;

    if (!previewWindow) {
      setError("The report preview is not ready yet.");
      return;
    }

    previewWindow.focus();
    previewWindow.print();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <Link
          href="/tools/pdf"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
        >
          <ArrowLeft size={16} />
          Back to Documents
        </Link>

        <header className="mt-8 max-w-3xl">
          <p className="text-sm font-bold uppercase text-blue-600">
            YAJU Documents
          </p>
          <h1 className="mt-3 text-3xl font-bold text-gray-950 sm:text-4xl">
            HTML to PDF
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
            Open HEC-HMS reports and other HTML files, check the layout, and
            save a print-ready PDF from your browser.
          </p>
        </header>

        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          {!sourceHtml ? (
            <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/40 px-6 text-center transition hover:border-blue-400 hover:bg-blue-50">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Upload size={22} />
              </div>
              <p className="mt-4 font-bold text-gray-950">
                Select an HTML report
              </p>
              <p className="mt-2 text-sm text-gray-600">
                HTML or HTM, up to 15 MB
              </p>
              <input
                type="file"
                accept=".html,.htm,text/html"
                onChange={handleFile}
                className="sr-only"
              />
            </label>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileCode2 size={22} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-gray-950">
                    {fileName}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatFileSize(fileSize)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <X size={16} />
                Remove
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center gap-2 text-sm text-gray-600">
            <ShieldCheck size={17} className="text-green-600" />
            The report stays in your browser.
          </div>
        </section>

        {sourceHtml && (
          <>
            <section className="mt-6 flex flex-col gap-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-6">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Page size
                  </p>
                  <div className="mt-2 inline-flex rounded-lg border border-gray-300 p-1">
                    {(["A4", "Letter"] as PageSize[]).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setPageSize(size)}
                        className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                          pageSize === size
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Orientation
                  </p>
                  <div className="mt-2 inline-flex rounded-lg border border-gray-300 p-1">
                    {(["portrait", "landscape"] as Orientation[]).map(
                      (value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setOrientation(value)}
                          className={`rounded-md px-4 py-2 text-sm font-semibold capitalize transition ${
                            orientation === value
                              ? "bg-blue-600 text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {value}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={printPdf}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Printer size={18} />
                Print / Save as PDF
              </button>
            </section>

            {relativeAssetCount > 0 && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                This report references {relativeAssetCount} local asset
                {relativeAssetCount === 1 ? "" : "s"}. If an image or stylesheet
                is missing in the preview, export a self-contained HTML report
                from HEC-HMS before saving the PDF.
              </p>
            )}

            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="font-bold text-gray-950">Report preview</h2>
                <span className="text-sm text-gray-500">
                  {pageSize} / {orientation}
                </span>
              </div>
              <iframe
                ref={iframeRef}
                title="HTML report preview"
                srcDoc={previewHtml}
                sandbox="allow-same-origin allow-modals"
                className="h-[70vh] min-h-[560px] w-full rounded-lg border border-gray-300 bg-white"
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
